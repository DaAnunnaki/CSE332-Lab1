# CSE332-Lab1

## Report

### Dataset Sources

1. Weekly whey protein sales data from 2020 to 2025
	Source: https://www.kaggle.com/datasets/zahidmughal2343/supplement-sales-data
2. Google search trends in the US for `protein`, `weight loss`, `carbs`, `diet`, `gym`, and `ozempic` from 2004 to 2026
	Source: https://trends.google.com/explore?geo=US&q=carbs%2Cdiet%2Cgym%2Cozempic&date=all

### Attributes

The fused dataset includes these sales-related attributes:

| Attribute | Description |
| --- | --- |
| Date | The observation date |
| Product Name | The supplement product name |
| Category | The product category |
| Units Sold | Number of units sold |
| Price | Product price |
| Revenue | Total revenue |
| Discount | Applied discount |
| Units Returned | Number of returned units |
| Location | Sales region |
| Platform | Sales platform |

Example: for a row around `2020-02`, the product might be whey protein in the protein category, with values for units sold, revenue, discount, units returned, location, and platform.

The dataset also includes these Google Trends keyword attributes:

- `protein`
- `weight loss`
- `carbs`
# CSE 332 Lab 2(a): Interactive PCA and k-means

This project explores the six Google Trends features in `fused_data - Sheet1.csv` using scikit-learn PCA and k-means, then displays the exported results with D3.

## Dataset and preprocessing

The fused CSV has 758 rows and 16 columns. The six selected measurements are `protein`, `weight loss`, `carbs`, `diet`, `gym`, and `ozempic`. `Date` is preserved as each observation's ID, not used as a measurement. Product name, category, location, and platform are categorical and excluded. Units sold, price, revenue, discount, and units returned are numeric sales measures, but are excluded from this Trends analysis: 566 rows have all five sales measures, 273 rows have all six Trends measurements, and only 81 rows have both sets complete. Using the six Trends features therefore retains 273 observations rather than reducing the search-interest analysis to the 81-row intersection.

All six selected measurements are numeric and nonconstant. Values are parsed as numbers; missing and nonfinite values are treated as missing, and rows missing any selected measurement are dropped rather than imputed. This leaves 273 matched rows and drops 485. Any constant selected feature would be removed after row filtering; none were found in this dataset. Features are standardized as `(x - mean) / population standard deviation` (`ddof=0`) before both PCA and k-means. The original selected values and date IDs are retained in the JSON for point matching and tooltips.

The source README described monthly Trends from 2004 to 2026. The current file's last Trends row is dated `2026-10-04`, which is after the current date used during this analysis (`2026-09-28`), and dates near the end are not consistently on the first of each month. Verify those dates against the source before making time-based claims.

## Calculations and interactions

- `pca.py` uses scikit-learn `PCA()` with all six available components; it exports eigenvalues, explained-variance ratios, component vectors, and projected coordinates in the same feature order.
- The initial `di` is 2. A documented geometric heuristic selects the interior scree point with greatest perpendicular distance from the line joining the first and last eigenvalue points. This is a starting choice, not a claim that an elbow is always clear.
- Feature contribution is the sum of squared **unit-eigenvector coefficients** across PC1 through PC`di`. This convention is isolated in `attribute_scores()` in `pca.py`; a course definition using coefficients multiplied by square-root eigenvalues would require changing that function and the matching JavaScript calculation.
- Biplot arrows use each feature's coefficients in the two selected component vectors, multiplied by a fixed 3.0 display factor. Points remain projected observations; k-means colors are computed on all six standardized original features.
- K-means runs for k=1 through 10 with `random_state=0` and `n_init=20`. Error is defined as inertia / observation count, the mean squared Euclidean distance to the assigned centroid. Initial k=3 uses the same geometric interior-point heuristic against the endpoint chord. The curve should be inspected because it does not have a uniquely sharp elbow.
- Clicking a scree bar updates `di`, cumulative variance, rankings, and the default top-four original features in the matrix. The table checkboxes allow any four features to be selected.
- Clicking the k-means curve changes cluster assignments and the colors/legend in both point visualizations. Changing PCA axes only changes projected points/arrows/labels; it does not recompute clusters.
- Point tooltips show the preserved date ID and original feature values.

For `di=2`, PC1 explains 62.9%, PC2 19.1%, and together they explain 82.0%. Under the stated loading-score convention, the leading features are diet (0.6188), ozempic (0.3223), weight loss (0.2803), and carbs (0.2721). These are exploratory descriptions, not evidence of causation.

## Setup and run

Requirements: Python 3.9 or later, `pnpm`, and internet access for the existing D3 ES-module import from jsDelivr.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python pca.py
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The command regenerates `pca_results.json` beside the source and dataset. To regenerate later, run `.venv/bin/python pca.py` again, then reload the page. On Windows, use the corresponding `.venv\\Scripts\\python.exe` path.

## Submission files

- [REPORT_DRAFT.md](REPORT_DRAFT.md): implementation summary and observations from the generated results.
- [DEMO_OUTLINE.md](DEMO_OUTLINE.md): narrated walkthrough outline.
- `Lab2a-submission.zip`: generated source/data package, excluding dependency and virtual-environment directories.

The voice-narrated video must be recorded and submitted separately on Brightspace.