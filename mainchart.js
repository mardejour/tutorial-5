/**
 * CONSTANTS AND GLOBALS
 * */
const width = window.innerWidth * 0.9,
  height = window.innerHeight * 0.7,
  margin = { top: 20, bottom: 50, left: 60, right: 40 };

/** these variables allow us to access anything we manipulate in
 * init() but need access to in draw().
 * All these variables are empty before we assign something to them.*/
let svg;
let tooltip;

/**
 * APPLICATION STATE
 * */
let state = {
  geojson: null,
  races: null,
  hover: {
    White: null,
    Latino: null,
   	Asian: null,
   	Black: null,
   	Other: null,
    state: null
  },
};

/**
 * LOAD DATA
 * Using a Promise.all([]), we can load more than one dataset at a time
 * */
Promise.all([
  d3.json("usState.json"),
  d3.csv("acs5_2017_race_states.csv", d3.autoType),
]).then(([geojson, races]) => {
  state.geojson = geojson;
  state.races = races.map(d => {
  return {
    geoid: +d.geoid,
    Name: d.name,
    White: +d.white_alone,
    Black: +d.black_alone,
    Asian: +d.asian_all,
    Latino: +d.latino_alone,
    Other: +d.other_all,
    Total: +d.total
  }});
  // console.log("state: ", state);
  init();
});

/**
 * INITIALIZING FUNCTION
 * this will be run *one time* when the data finishes loading in
 * */
function init() {
  // our projection and path are only defined once, and we don't need to access them in the draw function,
  // so they can be locally scoped to init()
  const projection = d3.geoAlbersUsa().fitSize([width, height], state.geojson);
  const path = d3.geoPath().projection(projection);
  const colors = ["#4682b4", "#E25098", "#990066"];
  const hRaces = ["White", "Latino", "Asian", "Black", "Other"];
  var raceColors = d3.scaleOrdinal(d3.schemePastel1).domain(hRaces);
  const legendText = ["> 10 million", "> 1 million", "> 100,000"];

  // create an svg element in our main `d3-container` element
  const container = d3.select("#d3-container")
  	.style("position", "relative")
  	.style("width", width+"px")
  	.style("height", height+"px")
  	.style("margin-left", "5%")
  	.style("float", "left");

  tooltip = container
    .append("div")
    .attr("class", "tooltip")
    .attr("width", 100)
    .attr("height", 100)
    .style("position", "absolute");

  svg = container
    .append("svg")
    .attr("viewBox", "0 0 "+ width + " " + height)
    .attr("id", "svgContainer");

  state.geojson.features.forEach(function(stateProp, i) {
  	state.races.filter(function(race) {
    	if ((race.geoid == stateProp.properties.GEOID)) {
  			var centroid = path.centroid(stateProp);
				if (!isNaN(centroid[0]) && !isNaN(centroid[1])) {
			    const [x, y] = [centroid[0], centroid[1]];
			    race.x = x.toFixed(4);
			    race.y = y.toFixed(4);
			  }
			  else { // move non found data away
			    race.x = -100;
			    race.y = -100;			  	
			  }
	  	}
  	})
  });

  function dominantRace(gid) {
  	var matchRow = state.races.filter(race => race.geoid == gid);
  	if (matchRow.length > 0) {
		  var maxRow = Object.keys(matchRow[0]).slice(1,-3).reduce(function(a,b) { return matchRow[0][a] > matchRow[0][b] ? a : b });
		  return raceColors(maxRow);
  	}
  }

  var geostates = svg
    .selectAll(".state")
    // all of the features of the geojson, meaning all the states as individuals
    .data(state.geojson.features)
    .join("path")
    .attr("d", path)
    .attr("class", function(d) { return "state"; } )
    .attr("fill", function(d) { return dominantRace(d.properties.GEOID); /*"#eee"*/ })
    .on("mouseover", d => {
      // when the mouse rolls over this feature, do this
      state.hover["state"] = d.properties.NAME;
      draw(); // re-call the draw function when we set a new hoveredState
    });

  // EXAMPLE 1: going from Lat-Long => x, y
  // for how to position a dot
//  const GradCenterCoord = { latitude: 40.7423, longitude: -73.9833 };
  svg
    .selectAll("circle")
    .data(state.races)
    .join("circle")
    .attr("r", function(d) { return 2*Math.log10(d.Total); } )
    .attr("fill", function(d) {
    	if (d.Total > 10000000) return colors[0]
    	else {
    		if (d.Total > 1000000) return colors[1]
    		else return colors[2]
    	}
    })
    .attr("opacity", 0.7)
    .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
    .on("mouseover", function(d) {
      state.hover = {
        translate: [
          // center top left corner of the tooltip in center of tile
          d.x,
          d.y
        ],
			  Name: d.Name,
        White: d.White,
			  Latino: d.Latino,
			 	Asian: d.Asian,
			 	Black: d.Black,
			 	Other: d.Other
      };
      draw();
    });

  var legend = svg
  	.selectAll("g.legend")
  	.data(colors)
  	.join("g")
  	.attr("class", "legend");
  legend
  	.append("circle")
  	.attr("cx", 12)
  	.attr("cy", function(d,i) { return 12+(i*32); })
  	.attr("r", 12)
  	.attr("fill", function(d,i) { return colors[i] });
  legend
  	.append("text")
  	.attr("x", 32)
  	.attr("y", function(d,i) { return 18+(i*32); })
  	.html(function(d,i) { return legendText[i] });

  var raceLabel = svg
  	.append("text")
  	.attr("x", 0)
  	.attr("y", 148)
  	.text("Dominant race");

  var legendRace = svg
  	.selectAll("g.race")
  	.data(hRaces)
  	.join("g")
  	.attr("class", "race");
  legendRace
  	.append("rect")
  	.attr("x", 0)
  	.attr("y", function(d,i) { return 160+(i*32); })
  	.attr("height", 24)
  	.attr("width", 24)
  	.attr("fill", function(d,i) { return raceColors(hRaces[i]) });
  legendRace
  	.append("text")
  	.attr("x", 32)
  	.attr("y", function(d,i) { return 176+(i*32); })
  	.html(function(d,i) { return hRaces[i] });

  // EXAMPLE 2: going from x, y => lat-long
  // this triggers any movement at all while on the svg
  svg.on("mousemove", () => {
    // we can use d3.mouse() to tell us the exact x and y positions of our cursor
    const [mx, my] = d3.mouse(svg.node());
    // projection can be inverted to return [lat, long] from [x, y] in pixels
    const proj = projection.invert([mx, my]);
    state.hover["longitude"] = proj[0];
    state.hover["latitude"] = proj[1];
    draw();
  });

  draw(); // calls the draw function
}

/**
 * DRAW FUNCTION
 * we call this everytime there is an update to the data/state
 * */
/**
 * DRAW FUNCTION
 * we call this everytime there is an update to the data/state
 * */
function draw() {
  if (state.hover.Name) {
    tooltip
      .html(
        `
        <div><span class="bold">${state.hover.Name}</span></div>
        <div><span class="bold">White:</span> ${state.hover.White}</div>
        <div><span class="bold">Latino:</span> ${state.hover.Latino}</div>
        <div><span class="bold">Asian:</span> ${state.hover.Asian}</div>
        <div><span class="bold">Black:</span> ${state.hover.Black}</div>
        <div><span class="bold">Other:</span> ${state.hover.Other}</div>
      `
      )
      .transition()
      .duration(500)
      .style(
        "transform",
        `translate(${state.hover.translate[0]}px,${state.hover.translate[1]}px)`
      );
  }
}
