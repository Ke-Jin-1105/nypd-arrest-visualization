// add your JavaScript/D3 to this file
d3.json("daily_arrest_data.json").then(data => {
  const width = 800, height = 500, margin = { top: 20, right: 30, bottom: 50, left: 50 };

  // Prepare SVG
  const svg = d3.select("#plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);
  
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define a clipping path
  svg.append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height);
  
  // Apply clipping path to the group containing the lines
  const linesGroup = g.append("g")
    .attr("clip-path", "url(#clip)");
  
  // Parse date and prepare data
  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach(d => d.date = parseDate(d.date));

  const groupedData = d3.group(data, d => d.borough);

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([height, 0]);

  const color = {
    "Bronx": "#E7298A",
    "Brooklyn": "#6495ED",
    "Manhattan": "#E6AB02",
    "Queens": "#66A61E",
    "Staten Island": "#7570B3"
  };

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.count));

  // Axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y);

  const xAxisG = g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  g.append("g").call(yAxis);

  // Tooltip
  const tooltip = d3.select("#tooltip")
    .style("position", "absolute")
    .style("display", "none")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("padding", "8px")
    .style("font-size", "12px");


  // Draw lines
  const boroughs = Array.from(groupedData.keys());
  const activeBoroughs = new Set(boroughs);

  function updateLines() {
    const filteredBoroughs = Array.from(activeBoroughs);

    const lineSelection = g.selectAll(".line")
      .data(filteredBoroughs, d => d); 

    lineSelection.exit().remove();

    lineSelection
      .attr("d", d => line(groupedData.get(d).filter(pt => (
        pt.date >= x.domain()[0] && pt.date <= x.domain()[1] 
      ))));
      
    lineSelection.enter()
      .append("path")
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", d => color[d])
      .attr("stroke-width", 2)
      .attr("d", d => line(groupedData.get(d).filter(pt => (
        pt.date >= x.domain()[0] && pt.date <= x.domain()[1] 
      ))));
  }

  updateLines();

  // Hover functionality
  svg.on("mousemove", function (event) {
    const [mouseX] = d3.pointer(event, this);
    const hoveredDate = x.invert(mouseX - margin.left);
    const tooltipData = Array.from(activeBoroughs).map(borough => {
      const closestPoint = groupedData.get(borough).reduce((a, b) => (
        Math.abs(a.date - hoveredDate) < Math.abs(b.date - hoveredDate) ? a : b
      ));
      return { borough, count: closestPoint.count };
    });

    tooltip
      .style("display", "block")
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY - 10}px`)
      .html(`
        <strong>${d3.timeFormat("%b %d, %Y")(hoveredDate)}</strong><br>
        ${tooltipData.map(d => `${d.borough}: ${d.count}`).join("<br>")}
      `);
  }).on("mouseleave", () => tooltip.style("display", "none"));

  // Buttons to toggle lines
  const buttonsContainer = d3.select("#buttons-container");
  boroughs.forEach(borough => {
    const button = buttonsContainer.append("div")
      .attr("class", "borough-button active")
      .on("click", function () {
        const isActive = activeBoroughs.has(borough);
        if (isActive) {
          activeBoroughs.delete(borough);
          d3.select(this).classed("active", false);
        } else {
          activeBoroughs.add(borough);
          d3.select(this).classed("active", true);
        }
        updateLines();
      });

    button.append("div")
      .attr("class", "borough-box")
      .style("background-color", color[borough]);

    button.append("span").text(borough);
  });

  // Dual-end Date slider
  const [minDate, maxDate] = d3.extent(data, d => d.date);

  const slider = d3.sliderBottom()
    .min(minDate)
    .max(maxDate)
    .width(500)
    .tickFormat(d3.timeFormat("%b %Y"))
    .ticks(10)
    .default([minDate, maxDate])
    .on('onchange', val => {
      x.domain(val);
      xAxisG.call(xAxis);
      updateLines();
    });

  const sliderSvg = d3.select("#slider-container")
    .append("svg")
    .attr("width", 800)
    .attr("height", 70)
    .append("g")
    .attr("transform", "translate(75,20)");

  sliderSvg.call(slider);
});
