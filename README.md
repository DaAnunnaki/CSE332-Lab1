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
- `diet`
- `gym`
- `ozempic`

These columns represent search interest over time. For example, on a date such as `2020-02`, the `protein` column records the relative search interest for that keyword.

### Why These Data Are Interesting

These data are interesting because they make it possible to compare supplement sales with public interest in related health and fitness topics over time. Looking at sales together with Google search trends can reveal patterns in consumer behavior and broader market interest.

### Implementation Notes

The visualization is built with D3. The implementation includes data cleaning, transformation, and fusion so the sales data and Google Trends data can be viewed together in a consistent format.

Copilot was used for parts of the frontend of the website and for part of the graph-building process. The basic D3 graph construction, the choice of which data to use, and the intended look of the visualizations were decided and written by me. I tried several different approaches and ultimately decided to focus on trends over time using the `Date` column.

Notable implementation details:

- Weekly sales data was combined into monthly totals to better match the monthly Google Trends data.
- The fused dataset was cleaned to keep only the relevant columns.
- Missing values were handled during preprocessing.
- Date formats were standardized across both datasets.
- The final visualization supports multiple chart types and variable-selection controls for exploring the combined data.