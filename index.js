import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const DATA_PATH = "./fused_data - Sheet1.csv";
const DATE_COLUMN = "Date";
const SALES_START_DATE = new Date("2020-01-01T00:00:00");
const SALES_END_DATE = new Date("2025-01-31T23:59:59.999");
const MONTHLY_SALES_COLUMNS = new Set([
    "Units Sold",
    "Price",
    "Revenue",
    "Discount",
    "Units Returned"
]);

const chartRoot = d3.select("#chart");
const scatterplotRoot = d3.select("#scatterplot");
const variableSelect = d3.select("#variable-select");
const scatterVariableSelect = d3.select("#scatter-variable-select");
const orientationInputs = d3.selectAll('input[name="chart-orientation"]');
const scatterAxisInputs = d3.selectAll('input[name="scatter-axis-assignment"]');
const chartMeta = d3.select("#chart-meta");
const status = d3.select("#status");
const scatterMeta = d3.select("#scatter-meta");
const scatterStatus = d3.select("#scatter-status");
const tooltip = d3.select("#tooltip");

const margin = { top: 28, right: 28, bottom: 56, left: 72 };
const width = 1040;
const height = 520;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const svg = chartRoot
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "Variable chart");

const plot = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const gridLayer = plot.append("g").attr("class", "grid");
const xAxisLayer = plot
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`);
const yAxisLayer = plot.append("g").attr("class", "axis");
const barsLayer = plot.append("g");
const hoverLabel = plot
    .append("text")
    .attr("class", "hover-label")
    .attr("fill", "#2f2618")
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .style("display", "none");

const xAxisLabel = svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 14)
    .attr("text-anchor", "middle")
    .text(DATE_COLUMN);

const yAxisLabel = svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerHeight / 2))
    .attr("y", 22)
    .attr("text-anchor", "middle");

const scatterMargin = { top: 28, right: 28, bottom: 56, left: 72 };
const scatterWidth = 1040;
const scatterHeight = 520;
const scatterInnerWidth = scatterWidth - scatterMargin.left - scatterMargin.right;
const scatterInnerHeight = scatterHeight - scatterMargin.top - scatterMargin.bottom;

const scatterSvg = scatterplotRoot
    .append("svg")
    .attr("viewBox", `0 0 ${scatterWidth} ${scatterHeight}`)
    .attr("role", "img")
    .attr("aria-label", "Scatterplot");

const scatterPlot = scatterSvg
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

const scatterGridLayer = scatterPlot.append("g").attr("class", "grid");
const scatterXAxisLayer = scatterPlot
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${scatterInnerHeight})`);
const scatterYAxisLayer = scatterPlot.append("g").attr("class", "axis");
const scatterPointsLayer = scatterPlot.append("g");

const scatterXAxisLabel = scatterSvg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", scatterMargin.left + scatterInnerWidth / 2)
    .attr("y", scatterHeight - 14)
    .attr("text-anchor", "middle");

const scatterYAxisLabel = scatterSvg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(scatterMargin.top + scatterInnerHeight / 2))
    .attr("y", 22)
    .attr("text-anchor", "middle");

let dataset = [];
let selectableColumns = [];
let numericColumns = [];
let columnTypes = new Map();
let currentOrientation = "upright";
let currentColumn = null;
let currentScatterAssignment = "x";

loadChart();

async function loadChart() {
    try {
        const rawRows = await d3.csv(DATA_PATH);

        if (!rawRows.length) {
            throw new Error("The CSV file is empty.");
        }

        const columns = rawRows.columns ?? Object.keys(rawRows[0]);
        const firstColumn = columns[0];
        const candidateColumns = columns.slice(1);

        dataset = rawRows
            .map((row) => {
                const parsedDate = parseDate(row[firstColumn]);

                if (!parsedDate) {
                    return null;
                }

                const parsedRow = {
                    [DATE_COLUMN]: row[firstColumn],
                    date: parsedDate
                };

                for (const column of candidateColumns) {
                    parsedRow[column] = (row[column] ?? "").trim();
                }

                return parsedRow;
            })
            .filter(Boolean);

        selectableColumns = candidateColumns.filter((column) => {
            const type = inferColumnType(column);
            if (!type) {
                return false;
            }

            columnTypes.set(column, type);
            return true;
        });

        numericColumns = selectableColumns.filter((column) => columnTypes.get(column) === "numeric");

        if (!selectableColumns.length) {
            throw new Error("No supported columns were found for the variable dropdown.");
        }

        variableSelect
            .selectAll("option")
            .data(selectableColumns)
            .join("option")
            .attr("value", (column) => column)
            .text((column) => `${column} (${columnTypes.get(column)})`);

        variableSelect.on("change", (event) => {
            renderVariable(event.target.value);
            renderScatterplot();
        });

        orientationInputs.on("change", (event) => {
            currentOrientation = event.target.value;
            if (currentColumn) {
                renderVariable(currentColumn);
            }
        });

        scatterVariableSelect
            .selectAll("option")
            .data(numericColumns)
            .join("option")
            .attr("value", (column) => column)
            .text((column) => column);

        if (numericColumns.length > 1) {
            scatterVariableSelect.property("value", numericColumns[1]);
        }

        scatterVariableSelect.on("change", () => {
            renderScatterplot();
        });

        scatterAxisInputs.on("change", (event) => {
            currentScatterAssignment = event.target.value;
            renderScatterplot();
        });

        renderVariable(selectableColumns[0]);
        renderScatterplot();
        status.text(`Loaded ${dataset.length} rows from ${firstColumn}.`);
    } catch (error) {
        status.text(error.message);
        scatterStatus.text(error.message);
    }
}

function renderVariable(column) {
    currentColumn = column;
    const type = columnTypes.get(column);

    if (type === "numeric") {
        renderDateHistogram(column);
        return;
    }

    if (type === "categorical") {
        renderBarChart(column);
        return;
    }

    status.text(`Unsupported column type for ${column}.`);
}

function renderScatterplot() {
    clearScatterplot();

    if (!currentColumn) {
        scatterStatus.text("Select a variable to draw the scatterplot.");
        return;
    }

    if (columnTypes.get(currentColumn) !== "numeric") {
        scatterMeta.text("Scatterplot requires the menu variable to be numeric.");
        scatterStatus.text("Choose a numeric variable from the menu to use the scatterplot.");
        return;
    }

    const secondColumn = scatterVariableSelect.property("value") || numericColumns[0];
    if (!secondColumn) {
        scatterStatus.text("No second numeric variable is available for the scatterplot.");
        return;
    }

    const xColumn = currentScatterAssignment === "x" ? currentColumn : secondColumn;
    const yColumn = currentScatterAssignment === "x" ? secondColumn : currentColumn;
    const xSeries = new Map(buildNumericSeriesForScatter(xColumn).map((row) => [row.date.toISOString(), row.value]));
    const ySeries = new Map(buildNumericSeriesForScatter(yColumn).map((row) => [row.date.toISOString(), row.value]));
    const points = Array.from(xSeries.entries())
        .filter(([dateKey]) => ySeries.has(dateKey))
        .map(([dateKey, xValue]) => ({
            date: new Date(dateKey),
            xValue,
            yValue: ySeries.get(dateKey)
        }))
        .sort((left, right) => d3.ascending(left.date, right.date));

    if (!points.length) {
        scatterMeta.text(`No overlapping monthly values exist for ${xColumn} and ${yColumn}.`);
        scatterStatus.text("Pick two numeric variables with overlapping months to see the scatterplot.");
        return;
    }

    const xScale = d3.scaleLinear()
        .domain(paddedDomain(d3.extent(points, (point) => point.xValue)))
        .range([0, scatterInnerWidth]);
    const yScale = d3.scaleLinear()
        .domain(paddedDomain(d3.extent(points, (point) => point.yValue)))
        .range([scatterInnerHeight, 0]);

    scatterGridLayer.call(
        d3.axisLeft(yScale).ticks(8).tickSize(-scatterInnerWidth).tickFormat("")
    );
    scatterXAxisLayer.call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("~s")));
    scatterYAxisLayer.call(d3.axisLeft(yScale).ticks(8).tickFormat(d3.format("~s")));

    scatterPointsLayer
        .selectAll("circle")
        .data(points, (point) => point.date.toISOString())
        .join("circle")
        .attr("cx", (point) => xScale(point.xValue))
        .attr("cy", (point) => yScale(point.yValue))
        .attr("r", 4.5)
        .attr("fill", "#0f766e")
        .attr("opacity", 0.8)
        .on("mouseenter", (event, point) => {
            d3.select(event.currentTarget).attr("r", 6).attr("opacity", 1);
            tooltip.style("opacity", 1).html(
                `<strong>${d3.timeFormat("%Y-%m")(point.date)}</strong><br>${xColumn}: ${formatValue(point.xValue)}<br>${yColumn}: ${formatValue(point.yValue)}`
            );
            moveTooltip(event);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave", (event) => {
            d3.select(event.currentTarget).attr("r", 4.5).attr("opacity", 0.8);
            tooltip.style("opacity", 0);
        });

    scatterXAxisLabel.text(xColumn);
    scatterYAxisLabel.text(yColumn);
    scatterMeta.text(`Scatterplot of ${xColumn} on the x-axis and ${yColumn} on the y-axis. ${points.length} overlapping monthly values are shown.`);
    scatterStatus.text(`Showing scatterplot for ${xColumn} and ${yColumn}.`);
}

function renderDateHistogram(column) {
    clearChart();

    const isMonthlySalesColumn = MONTHLY_SALES_COLUMNS.has(column);
    const visibleRows = isMonthlySalesColumn
        ? dataset.filter((row) => row.date >= SALES_START_DATE && row.date <= SALES_END_DATE)
        : dataset;
    const chartData = aggregateByMonth(visibleRows, column);

    if (!chartData.length) {
        clearChart();
        status.text(`No numeric values are available for ${column}.`);
        return;
    }

    if (currentOrientation === "sideways") {
        const xScale = d3.scaleLinear()
            .domain(paddedDomain(d3.extent(chartData, (row) => row.value)))
            .range([0, innerWidth]);
        const yScale = d3.scaleBand()
            .domain(chartData.map((row) => row.date.toISOString()))
            .range([0, innerHeight])
            .padding(0.08);
        const visibleTickValues = getSidewaysDateTickValues(chartData, yScale.bandwidth());

        drawSharedAxes(
            d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("~s")),
            d3.axisLeft(yScale)
                .tickValues(visibleTickValues)
                .tickFormat((value) => d3.timeFormat("%Y-%m")(new Date(value))),
            xScale,
            false,
            true
        );

        yAxisLayer.selectAll("text").attr("font-size", 10);

        barsLayer
            .selectAll("rect")
            .data(chartData, (row) => row.date.toISOString())
            .join("rect")
            .attr("x", 0)
            .attr("y", (row) => yScale(row.date.toISOString()))
            .attr("width", (row) => xScale(row.value))
            .attr("height", yScale.bandwidth())
            .attr("fill", "#0f766e")
            .on("mouseenter", (event, row) => {
                d3.select(event.currentTarget)
                    .attr("fill", "#115e59")
                    .attr("y", Math.max(0, yScale(row.date.toISOString()) - 1.5))
                    .attr("height", yScale.bandwidth() + 3);
                hoverLabel
                    .style("display", null)
                    .attr("x", Math.min(innerWidth - 4, xScale(row.value) + 8))
                    .attr("y", yScale(row.date.toISOString()) + yScale.bandwidth() / 2 + 4)
                    .text(d3.timeFormat("%Y-%m")(row.date));
                tooltip.style("opacity", 1).html(
                    `<strong>${column}</strong><br>${formatDateRangeLabel(row.date)}<br>${formatValue(row.value)}`
                );
                moveTooltip(event);
            })
            .on("mousemove", moveTooltip)
            .on("mouseleave", () => {
                barsLayer
                    .selectAll("rect")
                    .attr("fill", "#0f766e")
                    .attr("y", (datum) => yScale(datum.date.toISOString()))
                    .attr("height", yScale.bandwidth());
                hoverLabel.style("display", "none");
                tooltip.style("opacity", 0);
            });
    } else {
        const xScale = d3.scaleTime()
            .domain(d3.extent(chartData, (row) => row.date))
            .range([0, innerWidth]);
        const yScale = d3.scaleLinear()
            .domain(paddedDomain(d3.extent(chartData, (row) => row.value)))
            .range([innerHeight, 0]);

        drawSharedAxes(
            d3.axisBottom(xScale).ticks(Math.min(10, chartData.length)).tickFormat(d3.timeFormat("%Y-%m")),
            d3.axisLeft(yScale).ticks(8).tickFormat(d3.format("~s")),
            yScale,
            true,
            false
        );

        yAxisLayer.selectAll("text").attr("font-size", null);

        barsLayer
            .selectAll("rect")
            .data(chartData, (row) => row.date.toISOString())
            .join("rect")
            .attr("x", (row) => xScale(row.date))
            .attr("y", (row) => yScale(row.value))
            .attr("width", (row, index) => getDateBinWidth(chartData, index, xScale))
            .attr("height", (row) => innerHeight - yScale(row.value))
            .attr("fill", "#0f766e")
            .on("mouseenter", (event, row) => {
                d3.select(event.currentTarget).attr("fill", "#115e59");
                tooltip.style("opacity", 1).html(
                    `<strong>${column}</strong><br>${formatDateRangeLabel(row.date)}<br>${formatValue(row.value)}`
                );
                moveTooltip(event);
            })
            .on("mousemove", moveTooltip)
            .on("mouseleave", () => {
                d3.selectAll("rect").attr("fill", "#0f766e");
                tooltip.style("opacity", 0);
            });
    }

    xAxisLabel.text(currentOrientation === "sideways" ? column : DATE_COLUMN);
    yAxisLabel.text(currentOrientation === "sideways" ? DATE_COLUMN : column);
    const rangeLabel = isMonthlySalesColumn
        ? "Dates shown from January 2020 through January 2025. Values from the same month are added together."
        : "All available dates are shown.";
    chartMeta.text(`${column} is shown as a date-based histogram. ${chartData.length} monthly bins are shown. ${rangeLabel} Orientation: ${currentOrientation}.`);
    status.text(`Showing date-based histogram for ${column} in ${currentOrientation} orientation.`);
}

function renderBarChart(column) {
    clearChart();

    const categories = dataset
        .map((row) => row[column])
        .filter((value) => value !== "");

    if (!categories.length) {
        clearChart();
        status.text(`No categorical values are available for ${column}.`);
        return;
    }

    const counts = Array.from(
        d3.rollup(categories, (group) => group.length, (value) => value),
        ([category, count]) => ({ category, count })
    ).sort((left, right) => d3.descending(left.count, right.count) || d3.ascending(left.category, right.category));

    if (currentOrientation === "sideways") {
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(counts, (entry) => entry.count) ?? 0])
            .nice()
            .range([0, innerWidth]);
        const yScale = d3.scaleBand()
            .domain(counts.map((entry) => entry.category))
            .range([0, innerHeight])
            .padding(0.16);

        drawSharedAxes(
            d3.axisBottom(xScale).ticks(8),
            d3.axisLeft(yScale),
            xScale,
            false,
            true
        );

        barsLayer
            .selectAll("rect")
            .data(counts, (entry) => entry.category)
            .join("rect")
            .attr("x", 0)
            .attr("y", (entry) => yScale(entry.category))
            .attr("width", (entry) => xScale(entry.count))
            .attr("height", yScale.bandwidth())
            .attr("fill", "#0f766e")
            .on("mouseenter", (event, entry) => {
                tooltip.style("opacity", 1).html(
                    `<strong>${column}</strong><br>${entry.category}<br>Count: ${entry.count}`
                );
                moveTooltip(event);
            })
            .on("mousemove", moveTooltip)
            .on("mouseleave", () => {
                tooltip.style("opacity", 0);
            });

        xAxisLabel.text("Count");
        yAxisLabel.text(column);
    } else {
        const xScale = d3.scaleBand()
            .domain(counts.map((entry) => entry.category))
            .range([0, innerWidth])
            .padding(0.16);
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(counts, (entry) => entry.count) ?? 0])
            .nice()
            .range([innerHeight, 0]);

        drawSharedAxes(
            d3.axisBottom(xScale),
            d3.axisLeft(yScale).ticks(8),
            yScale,
            true,
            false
        );

        barsLayer
            .selectAll("rect")
            .data(counts, (entry) => entry.category)
            .join("rect")
            .attr("x", (entry) => xScale(entry.category))
            .attr("y", (entry) => yScale(entry.count))
            .attr("width", xScale.bandwidth())
            .attr("height", (entry) => innerHeight - yScale(entry.count))
            .attr("fill", "#0f766e")
            .on("mouseenter", (event, entry) => {
                tooltip.style("opacity", 1).html(
                    `<strong>${column}</strong><br>${entry.category}<br>Count: ${entry.count}`
                );
                moveTooltip(event);
            })
            .on("mousemove", moveTooltip)
            .on("mouseleave", () => {
                tooltip.style("opacity", 0);
            });

        xAxisLabel.text(column);
        yAxisLabel.text("Count");
    }

    chartMeta.text(`Bar chart of ${column}. ${counts.length} categories are counted across ${categories.length} non-empty rows. Orientation: ${currentOrientation}.`);
    status.text(`Showing bar chart for ${column} in ${currentOrientation} orientation.`);
}

function drawSharedAxes(xAxis, yAxis, gridScale, rotateLabels, horizontalGrid) {
    gridLayer.call(
        horizontalGrid
            ? d3.axisBottom(gridScale).ticks(8).tickSize(innerHeight).tickFormat("")
            : d3.axisLeft(gridScale).ticks(8).tickSize(-innerWidth).tickFormat("")
    );

    if (horizontalGrid) {
        gridLayer.attr("transform", null);
        gridLayer.selectAll("line").attr("transform", `translate(0,${-innerHeight})`);
    } else {
        gridLayer.attr("transform", null);
    }

    xAxisLayer.call(xAxis);
    yAxisLayer.call(yAxis);

    xAxisLayer
        .selectAll("text")
        .attr("transform", rotateLabels ? "rotate(-30)" : null)
        .style("text-anchor", rotateLabels ? "end" : "middle");
}

function clearChart() {
    barsLayer.selectAll("rect").remove();
    hoverLabel.style("display", "none");
    tooltip.style("opacity", 0);
}

function clearScatterplot() {
    scatterPointsLayer.selectAll("circle").remove();
    scatterGridLayer.selectAll("*").remove();
    scatterXAxisLayer.selectAll("*").remove();
    scatterYAxisLayer.selectAll("*").remove();
    scatterXAxisLabel.text("");
    scatterYAxisLabel.text("");
    tooltip.style("opacity", 0);
}

function aggregateByMonth(rows, column) {
    return d3.rollups(
        rows.filter((row) => Number.isFinite(parseNumber(row[column]))),
        (group) => d3.sum(group, (row) => parseNumber(row[column])),
        (row) => d3.timeMonth.floor(row.date).toISOString()
    )
        .map(([monthKey, value]) => ({
            date: new Date(monthKey),
            value
        }))
        .sort((left, right) => d3.ascending(left.date, right.date));
}

function buildNumericSeriesForScatter(column) {
    const visibleRows = MONTHLY_SALES_COLUMNS.has(column)
        ? dataset.filter((row) => row.date >= SALES_START_DATE && row.date <= SALES_END_DATE)
        : dataset;

    return aggregateByMonth(visibleRows, column);
}

function getDateBinWidth(chartData, index, xScale) {
    const start = chartData[index].date;
    const nextStart = chartData[index + 1]?.date ?? d3.timeMonth.offset(start, 1);
    return Math.max(2, xScale(nextStart) - xScale(start) - 1);
}

function getSidewaysDateTickValues(chartData, bandHeight) {
    const minLabelSpacing = 18;
    const step = Math.max(1, Math.ceil(minLabelSpacing / Math.max(1, bandHeight)));

    return chartData
        .filter((_, index) => index % step === 0)
        .map((row) => row.date.toISOString());
}

function formatDateRangeLabel(date) {
    const start = d3.timeFormat("%Y-%m")(date);
    const end = d3.timeFormat("%Y-%m")(d3.timeMonth.offset(date, 1));
    return `${start} to ${end}`;
}

function parseDate(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumber(value) {
    if (value == null || value === "") {
        return NaN;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function inferColumnType(column) {
    const nonEmptyValues = dataset
        .map((row) => row[column])
        .filter((value) => value !== "");

    if (!nonEmptyValues.length) {
        return null;
    }

    const allNumeric = nonEmptyValues.every((value) => Number.isFinite(parseNumber(value)));
    return allNumeric ? "numeric" : "categorical";
}

function paddedDomain([minimum, maximum]) {
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
        return [0, 1];
    }

    if (minimum === maximum) {
        const padding = minimum === 0 ? 1 : Math.abs(minimum) * 0.1;
        return [minimum - padding, maximum + padding];
    }

    const padding = (maximum - minimum) * 0.08;
    return [minimum - padding, maximum + padding];
}

function formatValue(value) {
    return Number.isInteger(value) ? d3.format(",d")(value) : d3.format(",.2f")(value);
}

function moveTooltip(event) {
    tooltip.style("left", `${event.clientX}px`).style("top", `${event.clientY}px`);
}
