# Lab 2(a) Report Draft

## Goal and data

This analysis uses the six Google Trends measurements (`protein`, `weight loss`, `carbs`, `diet`, `gym`, and `ozempic`) in the fused Lab 1 CSV. The CSV contains 758 rows. `Date` is retained as an observation identifier, and categorical columns are not treated as measurements. The five numerical sales columns are excluded from this Trends-only analysis: all five sales values are present in 566 rows, all six Trends values are present in 273 rows, and the complete-case intersection is 81 rows. Keeping the six Trends features retains 273 search-interest observations; the other 485 rows have missing selected measurements and are removed without imputation.

Each selected feature is standardized using its population mean and standard deviation. This puts measurements with different ranges on a comparable scale for both PCA and k-means. The original feature values and date IDs are carried into the browser export so each plotted point remains traceable to its source row.

## Methods

Scikit-learn PCA was fit to all six standardized features, retaining all six components. The first two components explain 82.0% of the total variance (62.9% for PC1 and 19.1% for PC2). The eigenvalue sequence begins 3.787, 1.152, 0.601, and 0.230. A maximum-distance-from-endpoint-chord heuristic selects `di=2` as the initial retained dimension. This rule is reproducible, but should not be mistaken for proof of a uniquely defined elbow.

The attribute score is the sum of squared unit-eigenvector coefficients for the first `di` components. At `di=2`, the leading scores are diet (0.6188), ozempic (0.3223), weight loss (0.2803), and carbs (0.2721). The code keeps the score calculation isolated because some courses define loadings as coefficients multiplied by the square root of the eigenvalue; confirm the course convention before final submission and change both the Python and browser formula if needed.

K-means was run on all six standardized measurements for k=1 through 10, using seed 0 and 20 initializations per k. The plotted error is inertia divided by 273, which is mean squared Euclidean distance to the assigned centroid. It falls from 6.0000 at k=1 to 3.3378 at k=2, 2.1248 at k=3, and 0.7826 at k=10. The initial k=3 is chosen by the same endpoint-chord heuristic. The decrease is gradual, so k=3 is a usable interactive starting point, not a definitive natural cluster count.

## Results and interpretation

At k=3, the cluster sizes are 116, 45, and 112. The average `ozempic` measurement is 0.53, 11.62, and 0.00 for those respective algorithmic cluster IDs; the second cluster also has the highest average `protein` value (50.53). The third cluster averages 3.64 for `carbs`, compared with 12.85 and 12.13 for the other two clusters. These averages describe this standardized-feature partition only. Cluster IDs are arbitrary, and the observed differences do not establish causes or explain changes over time.

The scatterplot matrix uses original measurements, defaulting to the four highest-ranked attributes at the current di. The biplot shows PCA coordinates and feature coefficient arrows. Its fixed 3.0 arrow multiplier is for legibility and does not alter the PCA calculations. Both point views use identical assignments and colors for the selected k.

## Limitations and checks

The complete-case analysis focuses on the Trends-only rows and does not jointly analyze the sales measures. The source includes a final Trends timestamp of `2026-10-04`, later than the analysis date of `2026-09-28`; several end-of-series dates are not month-start dates. Verify source dates before discussing temporal patterns. Google Trends values are relative search-interest measurements, not search counts. The analysis is exploratory and makes no causal claim.

The browser checks confirmed that selecting di=3 changes cumulative explained variance to 92.0%, recalculates the feature ranking, and changes the matrix selection; selecting k=5 redraws both point views and displays five legend entries; selecting PC4 updates the biplot axis label; and both point views retain 273 observations. The JSON export is written with nonfinite values disallowed.