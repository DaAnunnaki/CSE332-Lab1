# CSE 332 Lab 2(a): PCA, k-means, and sales/search exploration

This project uses the Lab 1 fused dataset to explore monthly whey protein sales alongside Google Trends search-interest measurements. Python prepares the numerical analysis and JSON export; the browser app uses D3 to visualize the results.

## Dataset and preprocessing

The fused CSV has 758 rows. Its 11 numerical measurements are `Units Sold`, `Price`, `Revenue`, `Discount`, `Units Returned`, `protein`, `weight loss`, `carbs`, `diet`, `gym`, and `ozempic`. `Date` is preserved as an observation ID and excluded as a measurement. `Product Name`, `Category`, `Location`, and `Platform` are categorical and excluded. In the 81 rows complete across all 11 numerical columns, `Product Name` is Whey Protein and `Category` is Protein; therefore `Units Sold` is the sales quantity relevant to the search comparison. Lab 1 describes aggregating weekly sales to monthly values to align with monthly Trends data. The fused overlap has 81 distinct date snapshots from `2020-01-06` through `2026-10-04`.

All 11 numerical measurements are used for PCA and k-means, matching the assignment workflow. Missing and nonfinite values are treated as missing; rows missing any selected numerical measurement are dropped, not imputed. This complete-case rule keeps 81 of 758 rows and excludes 677. The five sales values are jointly complete on 566 rows, the six Trends values on 273 rows, and their full intersection on 81 rows. The selected features are nonconstant in the retained rows. Any constant selected columns would be removed after row filtering; none were found. Every feature is standardized as `(x - mean) / population standard deviation` (`ddof=0`) before PCA and k-means. `Revenue` is related to `Units Sold` and `Price`, so those measures are not statistically independent; including all numerical columns follows the assignment but may give sales-related variation repeated influence in PCA/clustering.

The source data includes `2026-10-04`, which is later than the analysis date `2026-09-28`; verify that timestamp against the source. Values from Google Trends are relative search-interest measurements, not search counts. This app provides an exploratory analysis, not a causal test.

## PCA, rankings, and biplot

- `pca.py` uses scikit-learn `PCA()` with all 11 components and exports eigenvalues, explained-variance ratios, component vectors, projected coordinates, row IDs, and original numerical values in consistent feature order.
- Initial `di=4` is selected with a reproducible geometric heuristic: choose the interior scree point farthest from the straight line joining the first and last eigenvalue points. It is a starting estimate, not proof of a uniquely clear elbow.
- Feature scores are the sum of squared **unit-eigenvector coefficients** across PC1 through PC`di`. This convention is isolated in `attribute_scores()` in Python and matched in the browser. The assignment PDF does not define whether “loadings” instead means eigenvector coefficients multiplied by square-root eigenvalues; check any additional course material and change both calculations if that convention is required.
- Biplot point coordinates are the PCA projections of standardized observations. Attribute arrows use each feature's coefficients in the selected two component vectors, multiplied by a fixed 3.0 display factor. This follows the projection convention in the assignment slides; the multiplier affects display only.
- The initial matrix uses the four highest-ranked original attributes. Checkboxes allow other four-feature combinations. Clicking a scree bar updates `di`, cumulative variance, rankings, and the default matrix attributes.
- Selectors allow any two distinct PCA axes. Changing axes updates points, arrows, and labels without changing the k-means input or assignments.

## K-means and sales/search association

- K-means uses all 11 standardized numerical features for k=1 through 10, `random_state=0`, and `n_init=20`. Every k's assignments are exported and point order is preserved.
- The plotted error is inertia divided by the observation count: mean squared Euclidean distance to the assigned centroid. Initial `k=5` uses the same maximum-distance-from-endpoint-chord heuristic on the error curve. This is a heuristic choice, not a unique answer; the curve declines gradually.
- Clicking a k-means bar updates the biplot and matrix colors and the cluster legend.
- The separate sales/search chart reports Pearson correlation between `Units Sold` and each Trends feature on the same 81 complete observations. This correlation view answers the project motivation but is descriptive and does not establish causation. Hovering also shows Spearman rank correlation.

For the current data, Pearson correlations with Units Sold are: protein `0.287`, weight loss `0.250`, gym `0.243`, ozempic `0.136`, diet `0.017`, and carbs `-0.039` (`n=81`). Protein search has the largest positive Pearson correlation in this set, but the association is modest. Do not interpret it as evidence that search interest caused sales changes.

## Setup and run

Requirements: Python 3.9 or later, `pnpm`, and internet access for the D3 ES-module import from jsDelivr.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python pca.py
pnpm install
pnpm dev
```

Open `http://localhost:5173`. To regenerate results later, run `.venv/bin/python pca.py` and reload the page. On Windows, use `.venv\\Scripts\\python.exe` in place of `.venv/bin/python`.
