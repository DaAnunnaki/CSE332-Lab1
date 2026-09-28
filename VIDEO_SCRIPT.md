# Lab 2(a) Video Script

Approximate runtime: 5–7 minutes. Bracketed text is a recording cue, not narration.

## Opening and data

[Show the dashboard from the top.]

"Hi, this is my Lab 2(a) project. I wanted to explore whether whey protein sales might be associated with Google search interest in protein and related topics. The app combines two kinds of numerical measurements: five sales attributes and six Google Trends attributes.

"The sales attributes are Units Sold, Price, Revenue, Discount, and Units Returned. The Trends attributes are protein, weight loss, carbs, diet, gym, and ozempic. Date is used to identify each observation, not treated as a measurement. Product Name, Category, Location, and Platform are categories, so they are not included in PCA or k-means.

"The original fused CSV has 758 rows, but only 81 rows have values for all 11 numerical attributes. I use those complete rows so every observation has the same set of features. Rows with missing or non-finite numerical values are omitted rather than filled in. The 81 matched observations run from January 2020 to October 2026. The source data describes monthly values formed to align weekly sales with monthly search trends. I noticed that the last date shown is October 4, 2026, which is later than the current date for this analysis, so that date should be checked against the source."

## Sales and search association

[Point to the horizontal correlation bars. Hover over protein and then one other term.]

"This chart directly addresses my original question. Each bar is the Pearson correlation between Units Sold and one Google Trends feature, computed over the same 81 matched observations. Pearson correlation ranges from minus one to plus one. Values near plus one mean the two variables tend to rise together in a linear way; values near minus one tend to move in opposite directions; values near zero mean there is little linear association in this sample.

"The correlation with protein search is about 0.287. Weight loss is about 0.250, gym is about 0.243, ozempic is about 0.136, diet is about 0.017, and carbs is about negative 0.039. So protein search has the largest positive Pearson correlation here, but 0.287 is modest, not a strong relationship. Hovering shows Spearman correlation too. Spearman compares ranks rather than the exact values; for protein, it is about 0.162.

"These numbers describe association in this small sample. They do not show that searches caused sales to change. Other factors could affect both, and the observations are monthly rather than the original weekly sales records."

## PCA and the scree plot

[Show the scree plot and initial di selection.]

"Next, the PCA and clustering use all 11 numerical features. Because the features have different units and scales, I standardize each column first. For each value, I subtract that column's mean and divide by its population standard deviation. After that transformation, each feature is centered at zero and has a standard deviation of one, so a feature measured in dollars does not dominate only because its numbers are larger.

"PCA finds new, perpendicular directions that summarize variation across the standardized measurements. Each eigenvalue measures how much variance lies along one principal component. The scree plot displays those eigenvalues, with component number along the horizontal axis.

"The first eigenvalue is about 3.262, followed by 2.290, 1.828, and 1.179. To get an explained-variance percentage, I divide a component's eigenvalue by the sum of all 11 eigenvalues. The percentages for the first four components are about 29.3, 20.6, 16.4, and 10.6 percent. Together, PC1 through PC4 explain about 76.8 percent of the variance.

"The app starts with di equal to 4. This is chosen with a geometric heuristic: it finds the interior scree point farthest from a straight line connecting the first and last points. That gives a reproducible initial choice, but an elbow is a visual judgment, and the data does not guarantee one uniquely correct elbow. Clicking a bar changes di."

[Click PC3, pause to show the cumulative percentage and changed table/matrix, then click PC4 to restore the initial state.]

"When I choose PC3, the retained set becomes PC1 through PC3, and the cumulative explained variance updates to about 66.3 percent. The table is recalculated as well. The default four matrix attributes are then the four highest-ranked original features under the new di."

## Attribute scores and the biplot

[Point to the feature contribution table and biplot.]

"For the feature ranking, I add the squared PCA coefficients for each original feature across PC1 through the selected di. In other words, for this default di of 4, each table score is the sum of that feature's squared coefficients in the first four component vectors. The current top four are Revenue, Price, Units Returned, and Units Sold. These scores describe contribution under the convention used in my code; the assignment slides call these loadings but do not specify a different scaling convention, so I documented the convention explicitly.

"The biplot shows each observation projected onto two principal component axes. The horizontal and vertical coordinates are the observation's dot products with the selected PCA vectors. The axes include the percent of variance explained by each component.

"The arrows show the original feature directions. Each arrow uses that feature's coefficient in the horizontal component and its coefficient in the vertical component. I multiply all arrows by the same factor, three, so they are easier to see beside the points. This multiplier only changes how arrows are drawn; it does not change PCA or the observation coordinates. Hovering a point shows its date, original values, and cluster."

[Change one axis to PC3 or PC5, then try selecting the same component in both selectors.]

"I can also choose different PCA axes. The point locations, arrows, and labels update, but the cluster assignments do not, because clustering is calculated separately on all standardized original features. The selectors also prevent me from using the same component twice."

## Scatterplot matrix

[Show the matrix and the checkboxes. Replace one selected feature with protein.]

"The scatterplot matrix uses four selected original measurements, not four principal components. Each off-diagonal cell shows the pairwise relationship between its row and column features. The diagonal names the feature. Scales are kept consistent for each feature across its row or column. The points use the same cluster colors as the biplot.

"The checkboxes let me choose a different set of four features. For example, I can replace Revenue with protein to inspect one of the search measurements alongside the selected sales attributes. If I change di, the scores are recalculated and the default top four are selected again."

## K-means elbow and clusters

[Show the k-means bars and the initial k selection.]

"K-means groups observations by distance in the standardized 11-feature space. I ran it for k from one through ten. To make the results reproducible, the code uses random seed zero and 20 initializations for each k.

"The vertical value is mean squared distance to the assigned cluster center. Scikit-learn reports the sum of squared distances, called inertia. I divide inertia by the number of observations, 81, to get the mean squared distance. At k equal to one, the error is 11.000. At k equal to five, it is about 5.506, and at k equal to ten, it is about 3.854. Error decreases as more clusters are added, so I use another geometric elbow heuristic to choose an initial k of five. The decline is gradual, so five is an interactive starting point, not proof that there are exactly five natural groups.

"At k equals five, the cluster sizes are 20, 20, 12, 23, and 6. Cluster numbers are just labels assigned by the algorithm; cluster one is not inherently more important than cluster two."

[Click k=3 or k=7. Point to the selected bar, legend, biplot, and matrix.]

"Clicking another bar changes k and loads that run's stored cluster assignment for every row. The colors update in both the biplot and the scatterplot matrix, and the legend updates to show the new clusters. This does not change the PCA components or the input features."

## Closing

[Return to the default di=4 and k=5 if desired.]

"To summarize, the first four PCs explain about 76.8 percent of the variance in the standardized 11-feature dataset. The largest positive linear association with Units Sold among the six search terms is protein search at about 0.287, which is modest. This is an exploratory result, not a causal conclusion.

"There are two important limitations. First, requiring complete values across the five sales fields and six search fields leaves only 81 matched observations. Second, the fused data is monthly rather than weekly, and its final timestamp should be verified. Also, Revenue is related to Price and Units Sold, so those related sales measures may give sales variation repeated influence in PCA and clustering.

"That concludes my demonstration of the PCA scree plot, feature ranking, biplot, scatterplot matrix, k-means elbow plot, cluster interactions, and the sales-versus-search correlation view."
