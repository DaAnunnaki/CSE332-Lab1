import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const tooltip = d3.select("#tooltip");
const colors = d3.schemeTableau10;
let results;
let selectedDi;
let selectedK;
let selectedFeatures = [];
let xComponent = 0;
let yComponent = 1;

loadResults();

async function loadResults() {
    try {
        const response = await fetch("./pca_results.json");
        if (!response.ok) throw new Error(`Could not load PCA results (${response.status}). Run pca.py first.`);
        results = await response.json();
        validateResults();
        selectedDi = results.metadata.initial_di;
        selectedK = results.metadata.initial_k;
        selectedFeatures = rankedFeatures(selectedDi).slice(0, 4).map((entry) => entry.name);
        setupControls();
        renderScree();
        renderElbow();
        renderRanking();
        renderBiplot();
        renderMatrix();
        renderFootnotes();
    } catch (error) {
        d3.select("#app-error").append("p").attr("class", "error").text(error.message);
    }
}

function validateResults() {
    const count = results.rows.length;
    if (!count || results.pca.coordinates.length !== count) {
        throw new Error("The PCA export has mismatched observation coordinates.");
    }
    for (const model of results.kmeans) {
        if (model.assignments.length !== count) {
            throw new Error(`Cluster assignments for k=${model.k} do not match the observation rows.`);
        }
    }
    if (results.metadata.feature_names.length < 4) {
        throw new Error("At least four numerical features are needed for this dashboard.");
    }
}

function setupControls() {
    const options = results.pca.eigenvalues.map((_, index) => ({ index, label: `PC${index + 1}` }));
    for (const selector of ["#x-component", "#y-component"]) {
        d3.select(selector).selectAll("option").data(options).join("option")
            .attr("value", (entry) => entry.index).text((entry) => entry.label);
    }
    d3.select("#x-component").property("value", xComponent).on("change", (event) => {
        xComponent = Number(event.target.value);
        if (xComponent === yComponent) {
            yComponent = (xComponent + 1) % options.length;
            d3.select("#y-component").property("value", yComponent);
        }
        renderBiplot();
    });
    d3.select("#y-component").property("value", yComponent).on("change", (event) => {
        yComponent = Number(event.target.value);
        if (yComponent === xComponent) {
            xComponent = (yComponent + 1) % options.length;
            d3.select("#x-component").property("value", xComponent);
        }
        renderBiplot();
    });
    d3.select("#dataset-note").text(
        `${results.rows.length} observations · ${results.metadata.feature_names.length} features · ${results.rows[0].id} to ${results.rows.at(-1).id}`
    );
}

function renderScree() {
    const width = 620;
    const height = 310;
    const margin = { top: 14, right: 20, bottom: 54, left: 58 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const eigenvalues = results.pca.eigenvalues;
    const x = d3.scaleBand().domain(eigenvalues.map((_, index) => index + 1)).range([0, innerWidth]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(eigenvalues) * 1.08]).nice().range([innerHeight, 0]);
    const svg = d3.select("#scree-chart").append("svg").attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img").attr("aria-label", "Scree plot of PCA eigenvalues");
    const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    plot.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
    plot.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat((value) => `PC${value}`));
    plot.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5));
    plot.selectAll("rect").data(eigenvalues.map((value, index) => ({ component: index + 1, value })))
        .join("rect").attr("class", "bar")
        .attr("x", (entry) => x(entry.component)).attr("y", (entry) => y(entry.value))
        .attr("width", x.bandwidth()).attr("height", (entry) => innerHeight - y(entry.value))
        .attr("fill", (entry) => entry.component === selectedDi ? "#167b68" : "#a8c8b9")
        .attr("tabindex", 0).attr("role", "button")
        .attr("aria-label", (entry) => `Select di ${entry.component}; eigenvalue ${format(entry.value, 3)}`)
        .on("click", (_, entry) => changeDi(entry.component))
        .on("keydown", (event, entry) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); changeDi(entry.component); }
        })
        .on("mouseenter", (event, entry) => showTooltip(event, `<strong>PC${entry.component}</strong><br>Eigenvalue: ${format(entry.value, 3)}<br>Explained variance: ${format(results.pca.explained_variance_ratios[entry.component - 1] * 100, 1)}%`))
        .on("mousemove", moveTooltip).on("mouseleave", hideTooltip);
    svg.append("text").attr("class", "axis-label").attr("x", margin.left + innerWidth / 2).attr("y", height - 9).attr("text-anchor", "middle").text("Principal component");
    svg.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("x", -(margin.top + innerHeight / 2)).attr("y", 16).attr("text-anchor", "middle").text("Eigenvalue");
    updateDiSummary();
}

function changeDi(value) {
    selectedDi = value;
    selectedFeatures = rankedFeatures(selectedDi).slice(0, 4).map((entry) => entry.name);
    d3.select("#scree-chart rect").attr("fill", (entry) => entry.component === selectedDi ? "#167b68" : "#a8c8b9");
    updateDiSummary();
    renderRanking();
    renderMatrix();
}

function updateDiSummary() {
    const cumulative = d3.sum(results.pca.explained_variance_ratios.slice(0, selectedDi));
    d3.select("#di-summary").html(`<strong>Current di = ${selectedDi}</strong> · retains PC1–PC${selectedDi} · cumulative explained variance ${format(cumulative * 100, 1)}%`);
}

function renderElbow() {
    const width = 620;
    const height = 310;
    const margin = { top: 14, right: 20, bottom: 54, left: 68 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const models = results.kmeans;
    const x = d3.scaleLinear().domain([1, d3.max(models, (model) => model.k)]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(models, (model) => model.mean_squared_distance) * 1.08]).nice().range([innerHeight, 0]);
    const svg = d3.select("#elbow-chart").append("svg").attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img").attr("aria-label", "K-means clustering error by cluster count");
    const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    plot.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
    plot.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(models.length).tickFormat(d3.format("d")));
    plot.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".2f")));
    plot.append("path").datum(models).attr("fill", "none").attr("stroke", "#bc5b32").attr("stroke-width", 2)
        .attr("d", d3.line().x((model) => x(model.k)).y((model) => y(model.mean_squared_distance)));
    plot.selectAll("circle").data(models).join("circle")
        .attr("cx", (model) => x(model.k)).attr("cy", (model) => y(model.mean_squared_distance))
        .attr("r", (model) => model.k === selectedK ? 7 : 4.5)
        .attr("fill", (model) => model.k === selectedK ? "#167b68" : "#bc5b32")
        .attr("tabindex", 0).attr("role", "button")
        .attr("aria-label", (model) => `Select k ${model.k}; mean squared distance ${format(model.mean_squared_distance, 3)}`)
        .style("cursor", "pointer")
        .on("click", (_, model) => changeK(model.k))
        .on("keydown", (event, model) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); changeK(model.k); }
        })
        .on("mouseenter", (event, model) => showTooltip(event, `<strong>k = ${model.k}</strong><br>Mean squared distance: ${format(model.mean_squared_distance, 4)}<br>Observations: ${model.assignments.length}`))
        .on("mousemove", moveTooltip).on("mouseleave", hideTooltip);
    svg.append("text").attr("class", "axis-label").attr("x", margin.left + innerWidth / 2).attr("y", height - 9).attr("text-anchor", "middle").text("Number of clusters (k)");
    svg.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("x", -(margin.top + innerHeight / 2)).attr("y", 17).attr("text-anchor", "middle").text("Mean squared distance");
    updateKSummary();
}

function changeK(value) {
    selectedK = value;
    const model = results.kmeans.find((entry) => entry.k === selectedK);
    d3.select("#elbow-chart circle").attr("r", (entry) => entry.k === selectedK ? 7 : 4.5)
        .attr("fill", (entry) => entry.k === selectedK ? "#167b68" : "#bc5b32");
    updateKSummary(model);
    renderBiplot();
    renderMatrix();
}

function updateKSummary(model = results.kmeans.find((entry) => entry.k === selectedK)) {
    d3.select("#k-summary").html(`<strong>Current k = ${selectedK}</strong> · mean squared distance ${format(model.mean_squared_distance, 4)} · ${model.assignments.length} matched observations`);
}

function rankedFeatures(di) {
    return results.metadata.feature_names.map((name, featureIndex) => ({
        name,
        score: d3.sum(results.pca.components.slice(0, di), (component) => component[featureIndex] ** 2)
    })).sort((left, right) => d3.descending(left.score, right.score) || d3.ascending(left.name, right.name));
}

function renderRanking() {
    d3.select("#ranking-body").selectAll("tr").data(rankedFeatures(selectedDi), (entry) => entry.name)
        .join("tr")
        .html((entry, index) => `<td>${index + 1}</td><td>${escapeHtml(entry.name)}</td><td>${format(entry.score, 4)}</td><td><input type="checkbox" aria-label="Use ${escapeHtml(entry.name)} in scatterplot matrix" value="${escapeHtml(entry.name)}" ${selectedFeatures.includes(entry.name) ? "checked" : ""}></td>`)
        .select("input").on("change", (event) => {
            const name = event.target.value;
            if (event.target.checked && selectedFeatures.length >= 4) {
                event.target.checked = false;
                return;
            }
            selectedFeatures = event.target.checked ? [...selectedFeatures, name] : selectedFeatures.filter((feature) => feature !== name);
            renderMatrix();
        });
}

function renderBiplot() {
    const root = d3.select("#biplot");
    root.selectAll("*").remove();
    const width = 740;
    const height = 620;
    const plotSize = 500;
    const left = 120;
    const top = 24;
    const right = left + plotSize;
    const bottom = top + plotSize;
    const coordinates = results.pca.coordinates;
    const model = results.kmeans.find((entry) => entry.k === selectedK);
    const coefficientPairs = results.pca.components.map((component) => [component[xComponent], component[yComponent]]);
    const axisValues = coordinates.flatMap((point) => [point[xComponent], point[yComponent]]);
    const arrowValues = coefficientPairs.flatMap((pair) => pair.map((value) => value * 3));
    const limit = d3.max([...axisValues, ...arrowValues].map(Math.abs)) * 1.08;
    const x = d3.scaleLinear().domain([-limit, limit]).range([left, right]);
    const y = d3.scaleLinear().domain([-limit, limit]).range([bottom, top]);
    const svg = root.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img").attr("aria-label", "PCA biplot colored by k-means clusters");
    const plot = svg.append("g");
    plot.append("g").attr("class", "grid").attr("transform", `translate(0,${bottom})`).call(d3.axisBottom(x).ticks(7).tickSize(-plotSize).tickFormat(""));
    plot.append("g").attr("class", "grid").attr("transform", `translate(${left},0)`).call(d3.axisLeft(y).ticks(7).tickSize(-plotSize).tickFormat(""));
    plot.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", top).attr("y2", bottom).attr("stroke", "#94a39a").attr("stroke-dasharray", "4 4");
    plot.append("line").attr("x1", left).attr("x2", right).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "#94a39a").attr("stroke-dasharray", "4 4");
    plot.append("g").attr("class", "axis").attr("transform", `translate(0,${bottom})`).call(d3.axisBottom(x).ticks(7).tickFormat(d3.format(".1f")));
    plot.append("g").attr("class", "axis").attr("transform", `translate(${left},0)`).call(d3.axisLeft(y).ticks(7).tickFormat(d3.format(".1f")));
    plot.selectAll("circle.point").data(coordinates.map((coordinate, index) => ({ coordinate, index, cluster: model.assignments[index] })), (entry) => entry.index)
        .join("circle").attr("class", "point").attr("cx", (entry) => x(entry.coordinate[xComponent]))
        .attr("cy", (entry) => y(entry.coordinate[yComponent])).attr("r", 3.5)
        .attr("fill", (entry) => colors[entry.cluster % colors.length]).attr("opacity", 0.78)
        .on("mouseenter", (event, entry) => showTooltip(event, pointTooltip(entry.index, entry.cluster)))
        .on("mousemove", moveTooltip).on("mouseleave", hideTooltip);
    const features = results.metadata.feature_names.map((name, index) => ({
        name, vx: coefficientPairs[index][0] * 3, vy: coefficientPairs[index][1] * 3
    }));
    const defs = svg.append("defs");
    defs.append("marker").attr("id", "arrowhead").attr("viewBox", "0 -4 8 8").attr("refX", 7).attr("refY", 0)
        .attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
        .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", "#bc5b32");
    plot.selectAll("line.arrow").data(features).join("line").attr("class", "arrow")
        .attr("x1", x(0)).attr("y1", y(0)).attr("x2", (entry) => x(entry.vx)).attr("y2", (entry) => y(entry.vy)).attr("marker-end", "url(#arrowhead)");
    plot.selectAll("text.arrow-label").data(features).join("text").attr("class", "arrow-label")
        .attr("x", (entry) => x(entry.vx) + (entry.vx < 0 ? -5 : 5))
        .attr("y", (entry) => y(entry.vy) + (entry.vy < 0 ? 14 : -5))
        .attr("text-anchor", (entry) => entry.vx < 0 ? "end" : "start").text((entry) => entry.name);
    const xPercent = format(results.pca.explained_variance_ratios[xComponent] * 100, 1);
    const yPercent = format(results.pca.explained_variance_ratios[yComponent] * 100, 1);
    svg.append("text").attr("class", "axis-label").attr("x", left + plotSize / 2).attr("y", height - 12).attr("text-anchor", "middle").text(`PC${xComponent + 1} (${xPercent}% explained variance)`);
    svg.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("x", -(top + plotSize / 2)).attr("y", 18).attr("text-anchor", "middle").text(`PC${yComponent + 1} (${yPercent}% explained variance)`);
    renderLegend(model);
}

function renderLegend(model) {
    const clusterIds = Array.from(new Set(model.assignments)).sort(d3.ascending);
    d3.select("#cluster-legend").selectAll(".legend-item").data(clusterIds, (cluster) => cluster).join((enter) => {
        const item = enter.append("span").attr("class", "legend-item");
        item.append("i").attr("class", "swatch");
        item.append("span").attr("class", "legend-label");
        return item;
    }).each(function (cluster) {
        d3.select(this).select("i").style("background", colors[cluster % colors.length]);
        d3.select(this).select(".legend-label").text(`Cluster ${cluster + 1}`);
    });
}

function renderMatrix() {
    const root = d3.select("#matrix");
    root.selectAll("*").remove();
    if (selectedFeatures.length !== 4) {
        root.append("p").attr("class", "error").text(`Select exactly four attributes to draw the matrix (${selectedFeatures.length} selected).`);
        return;
    }
    const width = 880;
    const height = 824;
    const cell = 184;
    const gap = 6;
    const left = 104;
    const top = 42;
    const plotSize = 160;
    const model = results.kmeans.find((entry) => entry.k === selectedK);
    const svg = root.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img").attr("aria-label", "Scatterplot matrix for four selected original features");
    const domains = new Map(selectedFeatures.map((name) => [name, paddedExtent(results.rows.map((row) => row.values[name]))]));
    selectedFeatures.forEach((columnName, column) => {
        const x0 = left + column * (cell + gap);
        svg.append("text").attr("class", "chart-title").attr("x", x0 + plotSize / 2).attr("y", 20).attr("text-anchor", "middle").text(columnName);
        selectedFeatures.forEach((rowName, row) => {
            const y0 = top + row * (cell + gap);
            if (row === column) {
                svg.append("text").attr("x", x0 + plotSize / 2).attr("y", y0 + plotSize / 2 - 3).attr("text-anchor", "middle").attr("fill", "#167b68").attr("font-family", "Georgia, serif").attr("font-size", 17).text(rowName);
                return;
            }
            const x = d3.scaleLinear().domain(domains.get(columnName)).range([x0, x0 + plotSize]);
            const y = d3.scaleLinear().domain(domains.get(rowName)).range([y0 + plotSize, y0]);
            svg.append("rect").attr("x", x0).attr("y", y0).attr("width", plotSize).attr("height", plotSize).attr("fill", "#fffefa").attr("stroke", "#d9dfd8");
            svg.selectAll(`circle.cell-${row}-${column}`).data(results.rows.map((observation, index) => ({ observation, index })))
                .join("circle").attr("class", `point cell-${row}-${column}`)
                .attr("cx", (entry) => x(entry.observation.values[columnName])).attr("cy", (entry) => y(entry.observation.values[rowName]))
                .attr("r", 1.9).attr("fill", (entry) => colors[model.assignments[entry.index] % colors.length]).attr("opacity", 0.66)
                .on("mouseenter", (event, entry) => showTooltip(event, pointTooltip(entry.index, model.assignments[entry.index])))
                .on("mousemove", moveTooltip).on("mouseleave", hideTooltip);
            if (row === selectedFeatures.length - 1) {
                for (const fraction of [0, 0.5, 1]) {
                    const value = d3.interpolateNumber(...domains.get(columnName))(fraction);
                    svg.append("text").attr("class", "chart-title").attr("x", x(value)).attr("y", y0 + plotSize + 13).attr("text-anchor", "middle").text(format(value, 0));
                }
            }
            if (column === 0) {
                for (const fraction of [0, 0.5, 1]) {
                    const value = d3.interpolateNumber(...domains.get(rowName))(fraction);
                    svg.append("text").attr("class", "chart-title").attr("x", x0 - 5).attr("y", y(value) + 3).attr("text-anchor", "end").text(format(value, 0));
                }
            }
        });
    });
    svg.append("text").attr("class", "axis-label").attr("x", left + (plotSize * 4 + gap * 3) / 2).attr("y", height - 8).attr("text-anchor", "middle").text("Column attribute values");
    svg.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("x", -(top + (plotSize * 4 + gap * 3) / 2)).attr("y", 16).attr("text-anchor", "middle").text("Row attribute values");
}

function renderFootnotes() {
    const meta = results.metadata;
    d3.select("#data-footnote").text(
        `Prepared from ${meta.source_file}. ${meta.dropped_incomplete_rows} rows with missing/nonfinite candidate measurements were excluded; ${meta.removed_constant_features.length ? `constant features removed: ${meta.removed_constant_features.join(", ")}.` : "no constant features were found."} Date is retained as the observation ID, not a PCA measurement. Elbow defaults are geometric heuristics and should be interpreted alongside the plotted curves.`
    );
}

function pointTooltip(index, cluster) {
    const row = results.rows[index];
    const values = results.metadata.feature_names.map((name) => `${escapeHtml(name)}: ${format(row.values[name], 2)}`).join("<br>");
    return `<strong>${escapeHtml(row.id)}</strong> · Cluster ${cluster + 1}<br>${values}`;
}
function showTooltip(event, html) { tooltip.style("opacity", 1).html(html); moveTooltip(event); }
function moveTooltip(event) { tooltip.style("left", `${event.clientX}px`).style("top", `${event.clientY}px`); }
function hideTooltip() { tooltip.style("opacity", 0); }
function format(value, digits) { return d3.format(`,.${digits}f`)(value); }
function paddedExtent(values) {
    const [minimum, maximum] = d3.extent(values);
    const padding = (maximum - minimum) * 0.06 || 1;
    return [minimum - padding, maximum + padding];
}
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}