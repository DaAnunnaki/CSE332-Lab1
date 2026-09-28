"""Prepare fused monthly data and export PCA and k-means results for the browser."""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA


DATA_PATH = Path(__file__).with_name("fused_data - Sheet1.csv")
OUTPUT_PATH = Path(__file__).with_name("pca_results.json")
ROW_ID_COLUMN = "Date"
FEATURE_CANDIDATES = [
	"Units Sold", "Price", "Revenue", "Discount", "Units Returned",
	"protein", "weight loss", "carbs", "diet", "gym", "ozempic",
]
SEARCH_FEATURES = ["protein", "weight loss", "carbs", "diet", "gym", "ozempic"]
RANDOM_SEED = 0
N_INIT = 20
MAX_CLUSTERS = 10


def choose_geometric_elbow(values: list[float]) -> int:
	"""Return the interior point farthest from the line joining the endpoints."""
	if len(values) < 3:
		return 1

	points = np.column_stack((np.arange(1, len(values) + 1), values)).astype(float)
	start, end = points[0], points[-1]
	direction = end - start
	offsets = points - start
	distances = np.abs(direction[0] * offsets[:, 1] - direction[1] * offsets[:, 0])
	distances /= np.linalg.norm(direction)
	return int(np.argmax(distances[1:-1]) + 2)


def attribute_scores(component_vectors: np.ndarray, di: int) -> np.ndarray:
	"""Sum squared unit-eigenvector coefficients over the first di components."""
	return np.square(component_vectors[:di, :]).sum(axis=0)


def main() -> None:
	if not DATA_PATH.exists():
		raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

	data = pd.read_csv(DATA_PATH)
	if ROW_ID_COLUMN not in data.columns:
		raise ValueError(f"Required row identifier column {ROW_ID_COLUMN!r} is missing.")

	feature_names = [name for name in FEATURE_CANDIDATES if name in data.columns]
	if len(feature_names) < 4:
		raise ValueError("At least four supported numerical attributes are required.")

	numeric = data[feature_names].apply(pd.to_numeric, errors="coerce")
	numeric = numeric.replace([np.inf, -np.inf], np.nan)
	complete = numeric.notna().all(axis=1)
	kept = data.loc[complete].copy()
	numeric = numeric.loc[complete]

	nonconstant = numeric.columns[numeric.nunique(dropna=True) > 1].tolist()
	removed_constant = [name for name in feature_names if name not in nonconstant]
	feature_names = nonconstant
	numeric = numeric[feature_names]
	if len(feature_names) < 4:
		raise ValueError("Fewer than four nonconstant numerical attributes remain.")
	if len(numeric) < 2:
		raise ValueError("At least two complete observations are required.")

	means = numeric.mean(axis=0)
	standard_deviations = numeric.std(axis=0, ddof=0)
	standardized = (numeric - means) / standard_deviations
	matrix = standardized.to_numpy(dtype=float)

	pca = PCA()
	projected = pca.fit_transform(matrix)
	eigenvalues = pca.explained_variance_
	ratios = pca.explained_variance_ratio_
	max_clusters = min(MAX_CLUSTERS, len(matrix))
	cluster_results = []
	for k in range(1, max_clusters + 1):
		model = KMeans(n_clusters=k, random_state=RANDOM_SEED, n_init=N_INIT)
		assignments = model.fit_predict(matrix)
		cluster_results.append({
			"k": k,
			"inertia": float(model.inertia_),
			"mean_squared_distance": float(model.inertia_ / len(matrix)),
			"assignments": assignments.astype(int).tolist(),
		})

	sales_search_correlations = [
		{
			"feature": feature,
			"pearson_r": float(numeric["Units Sold"].corr(numeric[feature], method="pearson")),
			"spearman_rho": float(numeric["Units Sold"].corr(numeric[feature], method="spearman")),
		}
		for feature in SEARCH_FEATURES
		if feature in feature_names
	]

	scree_di = choose_geometric_elbow(eigenvalues.tolist())
	elbow_k = choose_geometric_elbow(
		[result["mean_squared_distance"] for result in cluster_results]
	)
	scores = attribute_scores(pca.components_, scree_di)
	ranking = sorted(
		zip(feature_names, scores.tolist()), key=lambda item: (-item[1], item[0])
	)
	raw_values = numeric.astype(float).to_dict(orient="records")

	result = {
		"metadata": {
			"source_file": DATA_PATH.name,
			"row_id_column": ROW_ID_COLUMN,
			"feature_names": feature_names,
			"candidate_features": FEATURE_CANDIDATES,
			"input_rows": int(len(data)),
			"used_rows": int(len(kept)),
			"dropped_incomplete_rows": int((~complete).sum()),
			"removed_constant_features": removed_constant,
			"standardization": "(x - feature mean) / population standard deviation (ddof=0)",
			"correlation_method": "Pearson correlation between Units Sold and each Google Trends feature on the same complete-case rows; descriptive association, not causation.",
			"pca_solver": "scikit-learn PCA with all available components",
			"loading_score": "sum of squared unit-eigenvector coefficients over PC1..PCdi",
			"arrow_convention": "unit-eigenvector coefficients; display multiplier 3.0",
			"initial_di": scree_di,
			"scree_elbow_method": "Interior eigenvalue farthest from the straight line joining the first and last scree points; heuristic only.",
			"initial_k": elbow_k,
			"kmeans_elbow_method": "Interior mean-squared-distance point farthest from the straight line joining k=1 and the maximum tested k; heuristic only.",
			"kmeans_distance_definition": "mean squared Euclidean distance to the assigned centroid = inertia / observation count",
			"random_seed": RANDOM_SEED,
			"n_init": N_INIT,
		},
		"rows": [
			{"id": str(row_id), "values": values}
			for row_id, values in zip(kept[ROW_ID_COLUMN].tolist(), raw_values)
		],
		"pca": {
			"eigenvalues": eigenvalues.tolist(),
			"explained_variance_ratios": ratios.tolist(),
			"components": pca.components_.tolist(),
			"coordinates": projected.tolist(),
		},
		"attribute_ranking": [
			{"name": name, "score": float(score)} for name, score in ranking
		],
		"sales_search_correlations": sales_search_correlations,
		"kmeans": cluster_results,
	}

	with OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
		json.dump(result, output_file, allow_nan=False, separators=(",", ":"))
		output_file.write("\n")

	print(
		f"Wrote {OUTPUT_PATH.name}: {len(kept)} observations, "
		f"{len(feature_names)} features, {len(cluster_results)} k values; "
		f"initial di={scree_di}, k={elbow_k}."
	)


if __name__ == "__main__":
	main()