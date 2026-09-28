# Lab 2(a) Report Draft

## Goal and data

The project began with the question of whether whey protein sales might move with public search interest in protein and related topics. The fused Lab 1 CSV contains 758 rows and 16 columns. The 11 numerical measurements used here are five sales fields (`Units Sold`, `Price`, `Revenue`, `Discount`, and `Units Returned`) and six Trends features (`protein`, `weight loss`, `carbs`, `diet`, `gym`, and `ozempic`). In rows complete across all numerical fields, the product is Whey Protein and the category is Protein. `Date` identifies each observation but is not used as a numerical measurement; product, category, location, and platform are categorical and are excluded.

The fused file's overlap contains 81 complete, unique monthly snapshots from `2020-01-06` through `2026-10-04`. The five sales measurements are all present in 566 rows, the six Trends measurements in 273 rows, and all 11 together in 81 rows. We use the intersection because PCA and k-means require a consistent feature vector for each row. Missing/nonfinite measurements are dropped, not imputed. The retained columns are nonconstant. Lab 1 describes aggregating weekly sales to monthly values to align with monthly search trends. The original values and date IDs are preserved for tooltips and row-to-cluster matching.

All 11 numerical measurements are standardized with the population mean and standard deviation before PCA and k-means. `Revenue` is closely related to `Units Sold` and `Price`; these are not independent measures, but all numerical columns are included as called for in the assignment workflow. The resulting component structure can therefore give related sales measures repeated influence.

## PCA and attribute selection

Scikit-learn PCA was fit to the 81-by-11 standardized matrix, retaining all 11 components. The first four components explain 76.8% cumulatively. The initial retained dimension is `di=4`, chosen by the interior scree point farthest from the line joining the first and last eigenvalue points. This geometric elbow rule is reproducible, but does not establish that the data has one objectively clear elbow.

The ranking score is the sum of squared unit-eigenvector coefficients for components PC1 through PC`di`. At `di=4`, the highest scores are Revenue (0.4987), Price (0.4561), Units Returned (0.4249), and Units Sold (0.4232). The assignment PDF names “squared sum of PCA loadings” but does not define whether a loading means an eigenvector coefficient or that coefficient multiplied by the square root of its eigenvalue. This implementation documents and isolates the unit-eigenvector convention; consult any additional course material before finalizing that choice.

The biplot projects standardized observations onto the selected component vectors. Its feature arrows use the feature's coefficients in those same vectors, scaled by a constant display multiplier of 3.0. The scatterplot matrix uses four original numerical attributes, initially the top-ranked four, and its checkboxes allow other features to be selected.

## Clustering and sales/search association

K-means runs on all 11 standardized measurements for k=1 through 10, with random seed 0 and `n_init=20`. Error is inertia divided by 81, the mean squared Euclidean distance to the assigned centroid. It falls from 11.000 at k=1 to 8.524 at k=2, 7.304 at k=3, 5.506 at k=5, and 3.854 at k=10. The initial `k=5` is chosen by the documented maximum-distance-from-endpoint-chord heuristic. The curve decreases gradually, so k=5 is an interactive starting point rather than a definitive natural cluster count. At k=5, cluster sizes are 20, 20, 12, 23, and 6; IDs are arbitrary labels.

For a direct view of the motivating relationship, the app separately calculates Pearson correlations between `Units Sold` and each Trends feature over the same 81 complete rows. They are protein `r=0.287`, weight loss `r=0.250`, gym `r=0.243`, ozempic `r=0.136`, diet `r=0.017`, and carbs `r=-0.039`. Protein search has the largest positive linear association among these six in this sample, but its correlation is modest. Spearman correlations are also available on hover and are weaker for protein (`rho=0.162`). These are descriptive correlations, not evidence that search interest causes sales.

## Limitations and interpretation

The complete-case intersection reduces the available data to 81 snapshots, and the fused file describes monthly sales aligned with Trends rather than retaining the original weekly resolution. The last supplied date, `2026-10-04`, is later than the analysis date `2026-09-28`; it should be checked against the source before making temporal claims. Google Trends values are relative search-interest measures, not search counts. Revenue's dependence on price and quantity can influence PCA and k-means because all numerical features are standardized but not decorrelated before PCA.

The browser provides clickable scree and k-means bars, editable PCA axes, feature rankings, a selected-feature scatterplot matrix, synchronized cluster colors/legend, and a separate sales/search correlation chart. The exported JSON is written with nonfinite values disallowed and checked so every PCA coordinate and each k's assignment is aligned to the same 81 source rows.