//File names for trip data and station names data
let fileName = "assets/data/metro-bike-share-trip-data.csv";
let stationNames = "assets/data/metro-bike-share-stations-2018-10-19.csv";

//variables for heat map
let firstDataMap = true;
let map = null;
let heatmap = null;
let stationMarkers = [];

//variables for start station and end station calculations
let startStationData = null;
let endStationData = null;
let popularStartLoc = null;
let popularEndLoc = null;
let popularStartStationName;
let popularEndStationName;
let totalTrips = 0;

//variables for bar chart
let splitArr = null;
let svgBar = null;

//variables for pie chart
let countChart = true;
let durationChart = false;
let monthlyChart = false;
let flexChart = false;
let walkUpChart = false;

let totalCountRouteMap = {};
let stationTripHourMap = {};
let totalDurationInSeconds = 0;

//variables for line chart
let dataLineChart = [];
let t = d3.transition().duration(1500);

//Calculate and update Average distance in KM and miles in index.HTML
function getAverageDistanceUsingDuration(){

    let totalDurationHour = totalDurationInSeconds/3600.0;

    //Assumed mph for average biker
    let averageSpeed = 10;

    //in Kilomters
    let miles = Math.round( (totalDurationHour * averageSpeed/totalTrips) * 100) / 100;

    // document.getElementById("avgSpeed").innerHTML = "Assuming the average speed for a biker in LA is " + averageSpeed + " miles/hour";
    // document.getElementById("totalDuration").innerHTML = "Total duration of all trips: " + totalDurationInSeconds + " seconds";
    // document.getElementById("numTrips").innerHTML = "Total number of trips: " + totalTrips;
    // document.getElementById("distMiles").innerHTML = "Average Distance in miles: " + miles + " miles";

}

//function to calculate distance based on starting Lat-Long and ending Lat-Long using haversine formula
function distanceLatLong(lat1, lon1, lat2, lon2) {

    let R = 6371; // Radius of the earth in km
    let dLat = (lat2 - lat1) * Math.PI / 180;  // deg2rad below
    let dLon = (lon2 - lon1) * Math.PI / 180;
    let a =
        0.5 - Math.cos(dLat)/2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon))/2;

    return R * 2 * Math.asin(Math.sqrt(a));
}

//function to get average distance between starting and ending lat/lon points
function getAverageDistance(csvdata){

    let totalDistance = 0.0;
    let i;
    let totalDurationRoundTrip = 0;
    let numOneWay = 0;
    let numRoundTrip = 0;

    let averageSpeed = 6;

    for (i = 1; i < csvdata["data"].length-1; i++){

        //ensure starting and ending lat-long are empty
        if(csvdata["data"][i][5].length !== 0 && csvdata["data"][i][6].length !== 0 && csvdata["data"][i][8].length !== 0 && csvdata["data"][i][9].length !== 0){

            let lat1 = parseFloat(csvdata["data"][i][5]);

            let lon1 = parseFloat(csvdata["data"][i][6]);

            let lat2 = parseFloat(csvdata["data"][i][8]);

            let lon2 = parseFloat(csvdata["data"][i][9]);

            if(lat1 === lat2 && lon1 === lon2){
                totalDurationRoundTrip += parseFloat(csvdata["data"][i][1]);
                numRoundTrip += 1;
            }
            else{
                totalDistance += distanceLatLong(lat1,lon1,lat2,lon2);
                numOneWay += 1;
            }
        }

    }

    document.getElementById("avgSpeed").innerHTML = "Assume that the average biker travels at " + averageSpeed + " Miles Per Hour.";

    let timeHours = totalDurationRoundTrip/3600.0;

    let kmRoundTrip = Math.round((timeHours * averageSpeed/numRoundTrip) * 100) / 100;

    //in Kilomters
    let kilometers = Math.round(totalDistance/numOneWay * 100) / 100;
    let miles =  Math.round(kilometers / 1.609 * 100) / 100;

    document.getElementById("numRoundTrip").innerHTML = numRoundTrip + " trips";
    document.getElementById("numOneWay").innerHTML = numOneWay + " trips";
    document.getElementById("distRoundTripKm").innerHTML = kmRoundTrip + " kilometers";
    document.getElementById("distOneWayKm").innerHTML = kilometers + " kilometers";

    let totalAvgDist = kilometers * (numOneWay/(numRoundTrip+numOneWay)) + kmRoundTrip * (numRoundTrip/(numRoundTrip+numOneWay));
    let roundedAvgDist = Math.round(totalAvgDist * 100) / 100;
    document.getElementById("avgCombinedDist").innerHTML = "Total Average Distance: " + roundedAvgDist + " kilometers";
    return kilometers + " kilometers";
}

//Get map with (key: station number -> value: number of occurrences)
function stationCountMap(csvdata, column){

    let map = {};

    let i;

    for(i = 1; i < csvdata["data"].length-1; i++){

        if (csvdata["data"][i][column].length !== 0) {
            let station = parseInt(csvdata["data"][i][column]);

            if (map[station] === undefined) {
                map[station] = 1;
            }
            else {
                map[station] += 1;
            }
        }

    }

    return map;
}

//given a map of station to number of occurences, find most popular station
function getMostPopularStation(map){

    let max = 0;
    let stationId = 0;

    for (let key in map) {
        if (map.hasOwnProperty(key)) {
            if(map[key] > max){
                max = map[key];
                stationId = key;
            }
        }
    }

    return stationId;
}

//gets map with (key: station number -> val: [lat,long])
function getStationLatLongMap(csvdata){

    let latLongMap = {};

    let i;
    for(i = 1; i < csvdata["data"].length-1; i++){

        if (csvdata["data"][i][4].length !== 0 && csvdata["data"][i][5].length !== 0 && csvdata["data"][i][6].length !== 0) {
            let station = parseInt(csvdata["data"][i][4]);

            if (latLongMap[station] === undefined) {
                latLongMap[station] = [parseFloat(csvdata["data"][i][5]), parseFloat(csvdata["data"][i][6])];
            }
        }

    }

    return latLongMap;
}

//function to get an array with number of riders of specified pass type
//return [numMonthlyPass, numFlexPass, numStaffAnnual, numWalkUp]
function countRegularRiders(csvdata){

    let i;

    //count and numRoundTrip, numOneWay
    let numMonthlyPass = [0,0,0];
    let numFlexPass = [0,0,0];
    let numStaffAnnual = [0,0,0];
    let numWalkUp = [0,0,0];

    for (i = 1; i < csvdata["data"].length-1; i++){

        if (csvdata["data"][i][13].length !== 0){

            if (csvdata["data"][i][13] === "Monthly Pass"){
                numMonthlyPass[0] += 1;
                if (csvdata["data"][i][12] === "Round Trip"){
                    numMonthlyPass[1] += 1;
                }
                else{
                    numMonthlyPass[2] += 1;
                }
            }
            else if(csvdata["data"][i][13] === "Flex Pass"){
                numFlexPass[0] += 1;
                if (csvdata["data"][i][12] === "Round Trip"){
                    numFlexPass[1] += 1;
                }
                else{
                    numFlexPass[2] += 1;
                }
            }
            else if(csvdata["data"][i][13] === "Walk-up"){
                numWalkUp[0] += 1;
                if (csvdata["data"][i][12] === "Round Trip"){
                    numWalkUp[1] += 1;
                }
                else{
                    numWalkUp[2] += 1;
                }
            }
            else {
                numStaffAnnual[0] += 1;
                if (csvdata["data"][i][12] === "Round Trip"){
                    numStaffAnnual[1] += 1;
                }
                else{
                    numStaffAnnual[2] += 1;
                }
            }

        }

    }

    return [numMonthlyPass, numFlexPass, numStaffAnnual, numWalkUp];

}

//function to load data into pie/donut chart
function d3PieChart(passHoldersArray){

    document.getElementById("regRidersDescription").innerHTML =
        "Out of " + totalTrips + " total trips, " + (passHoldersArray[0][0] + passHoldersArray[1][0] + passHoldersArray[2][0]) +
        " of them were done by regular riders who use bike sharing as a regular part of their commute. " +
        "Hover over each section of the pie chart to see the exact count" +
        ", as well as the breakdown of Trip Route Category-Passholder type combinations.";

    let donut = donutChart()
        .width(960)
        .height(500)
        .cornerRadius(3) // sets how rounded the corners are on each slice
        .padAngle(0.015) // effectively dictates the gap between slices
        .variable('Probability')
        .category('Pass');

    totalCountRouteMap["Monthly Pass"] = (passHoldersArray[0][1] + passHoldersArray[0][2]);
    totalCountRouteMap["Flex Pass"] = (passHoldersArray[1][1] + passHoldersArray[1][2]);
    totalCountRouteMap["Walk-up"] = (passHoldersArray[3][1] + passHoldersArray[3][2]);
    totalCountRouteMap["Staff Annual"] = (passHoldersArray[2][1] + passHoldersArray[2][2]);

    let data = [
        {Pass: "Staff Annual", Probability: (passHoldersArray[2][0])/totalTrips,
            "Round Trip": (passHoldersArray[2][1])/(passHoldersArray[2][1] + passHoldersArray[2][2]),
            "One Way": (passHoldersArray[2][2])/(passHoldersArray[2][1] + passHoldersArray[2][2])},
        {Pass: "Monthly Pass", Probability: (passHoldersArray[0][0])/totalTrips,
            "Round Trip": (passHoldersArray[0][1])/(passHoldersArray[0][1] + passHoldersArray[0][2]),
            "One Way": (passHoldersArray[0][2])/(passHoldersArray[0][1] + passHoldersArray[0][2])},
        {Pass: "Flex Pass", Probability: (passHoldersArray[1][0])/totalTrips,
            "Round Trip": (passHoldersArray[1][1])/(passHoldersArray[1][1] + passHoldersArray[1][2]),
            "One Way": (passHoldersArray[1][2])/(passHoldersArray[1][1] + passHoldersArray[1][2])},
        {Pass: "Walk-up", Probability: (passHoldersArray[3][0])/totalTrips,
            "Round Trip": (passHoldersArray[3][1])/(passHoldersArray[3][1] + passHoldersArray[3][2]),
            "One Way": (passHoldersArray[3][2])/(passHoldersArray[3][1] + passHoldersArray[3][2])}
        ];

    d3.select('#pieChart')
        .datum(data) // bind data to the div
        .call(donut); // draw chart in div
}

//function that initializes the donut chart
//Inspired by: https://bl.ocks.org/mbhall88/b2504f8f3e384de4ff2b9dfa60f325e2
function donutChart() {
    let width,
        height,
        margin = {top: 10, right: 10, bottom: 10, left: 10},
        colour = d3.scaleOrdinal(['#ffffcc','#a1dab4','#41b6c4','#225ea8']), // colour scheme
        variable, // value in data that will dictate proportions on chart
        category, // compare data by
        padAngle, // effectively dictates the gap between slices
        floatFormat = d3.format('.4r'),
        cornerRadius, // sets how rounded the corners are on each slice
        percentFormat = d3.format(',.2%');

    function chart(selection){
        selection.each(function(data) {
            // generate chart

            // ===========================================================================================
            // Set up constructors for making donut. See https://github.com/d3/d3-shape/blob/master/README.md
            let radius = Math.min(width, height) / 2;

            // creates a new pie generator
            let pie = d3.pie()
                .value(function(d) { return floatFormat(d[variable]); })
                .sort(null);

            // contructs and arc generator. This will be used for the donut. The difference between outer and inner
            // radius will dictate the thickness of the donut
            let arc = d3.arc()
                .outerRadius(radius * 0.8)
                .innerRadius(radius * 0.6)
                .cornerRadius(cornerRadius)
                .padAngle(padAngle);

            // this arc is used for aligning the text labels
            let outerArc = d3.arc()
                .outerRadius(radius * 0.9)
                .innerRadius(radius * 0.9);
            // ===========================================================================================

            // ===========================================================================================
            // append the svg object to the selection
            let svgPie = selection.append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
            // ===========================================================================================

            // ===========================================================================================
            // g elements to keep elements within svg modular
            svgPie.append('g').attr('class', 'slices');
            svgPie.append('g').attr('class', 'labelName');
            svgPie.append('g').attr('class', 'lines');
            // ===========================================================================================

            // ===========================================================================================
            // add and colour the donut slices
            let path = svgPie.select('.slices')
                .datum(data).selectAll('path')
                .data(pie)
                .enter().append('path')
                .attr('fill', function(d) {
                    return colour(d.data[category]); })
                .attr('d', arc);
            // ===========================================================================================

            // ===========================================================================================
            // add text labels
            let label = svgPie.select('.labelName').selectAll('text')
                .data(pie)
                .enter().append('text')
                .attr('dy', '.35em')
                .html(function(d) {
                    // add "key: value" for given category. Number inside tspan is bolded in stylesheet.
                    return d.data[category] + ': <tspan>' + percentFormat(d.data[variable]) + '</tspan>';
                })
                .attr('transform', function(d) {

                    // effectively computes the centre of the slice.
                    // see https://github.com/d3/d3-shape/blob/master/README.md#arc_centroid
                    let pos = outerArc.centroid(d);

                    // changes the point to be on left or right depending on where label is.
                    pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
                    return 'translate(' + pos + ')';
                })
                .style('text-anchor', function(d) {
                    // if slice centre is on the left, anchor text to start, otherwise anchor to end
                    return (midAngle(d)) < Math.PI ? 'start' : 'end';
                });
            // ===========================================================================================

            // ===========================================================================================
            // add lines connecting labels to slice. A polyline creates straight lines connecting several points
            let polyline = svgPie.select('.lines')
                .selectAll('polyline')
                .data(pie)
                .enter().append('polyline')
                .attr('points', function(d) {

                    // see label transform function for explanations of these three lines.
                    let pos = outerArc.centroid(d);
                    pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
                    return [arc.centroid(d), outerArc.centroid(d), pos]
                });
            // ===========================================================================================

            // ===========================================================================================
            // add tooltip to mouse events on slices and labels
            d3.selectAll('.labelName text, .slices path').call(toolTip);
            // ===========================================================================================

            // ===========================================================================================
            // Functions

            // calculates the angle for the middle of a slice
            function midAngle(d) { return d.startAngle + (d.endAngle - d.startAngle) / 2; }

            // function that creates and adds the tool tip to a selected element
            function toolTip(selection) {

                // add tooltip (svg circle element) when mouse enters label or slice
                selection.on('mouseenter', function (data) {

                    svgPie.append('text')
                        .attr('class', 'toolCircle')
                        .attr('dy', -15) // hard-coded. can adjust this to adjust text vertical alignment in tooltip
                        .html(toolTipHTML(data)) // add text to the circle.
                        .style('font-size', '1.5em')
                        .style('text-anchor', 'middle'); // centres text in tooltip

                    svgPie.append('circle')
                        .attr('class', 'toolCircle')
                        .attr('r', radius * 0.55) // radius of tooltip circle
                        .style('fill', colour(d3.rgb(0, 0, 0))) // colour based on category mouse is over
                        .style('fill-opacity', 0);

                });

                // remove the tooltip when mouse leaves the slice/label
                selection.on('mouseout', function () {
                    d3.selectAll('.toolCircle').remove();
                });
            }

            // function to create the HTML string for the tool tip. Loops through each key in data object
            // and returns the html string key: value
            function toolTipHTML(data) {

                let tip = '';
                let i = 0;

                for (var key in data.data) {

                    // if value is a number, format it as a percentage
                    let value = (!isNaN(parseFloat(data.data[key]))) ? percentFormat(data.data[key]) : data.data[key];
                    // leave off 'dy' attr for first tspan so the 'dy' attr on text element works. The 'dy' attr on
                    // tspan effectively imitates a line break.
                    if (i === 0){
                        tip += '<tspan x="0" font-size=".75em" dy = "-4em" style = "fill:white">' + key + ': ' + value + '</tspan>\n';
                    }
                    else {
                        tip += '<tspan x="0" font-size=".75em" dy="2em" style = "fill:white">' + key + ': ' + value + '</tspan>';

                        if(key === "Probability") {
                            tip += '<tspan x="0" font-size=".75em" dy="1em" style = "fill:white">' + "Total Count" + ': ' + ((data.data[key]) * totalTrips) + '</tspan>';
                        }
                        else{
                            tip += '<tspan x="0" font-size=".75em" dy="1em" style = "fill:white">' + "Total Count" + ': ' + Math.round(((data.data[key]) * totalCountRouteMap[data.data["Pass"]])) + '</tspan>';
                        }
                    }
                    i++;
                }

                return tip;
            }
            // ===========================================================================================

        });
    }

    // getter and setter functions. See Mike Bostocks post "Towards Reusable Charts" for a tutorial on how this works.
    chart.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return chart;
    };

    chart.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return chart;
    };

    chart.margin = function(value) {
        if (!arguments.length) return margin;
        margin = value;
        return chart;
    };

    chart.radius = function(value) {
        if (!arguments.length) return radius;
        radius = value;
        return chart;
    };

    chart.padAngle = function(value) {
        if (!arguments.length) return padAngle;
        padAngle = value;
        return chart;
    };

    chart.cornerRadius = function(value) {
        if (!arguments.length) return cornerRadius;
        cornerRadius = value;
        return chart;
    };

    chart.colour = function(value) {
        if (!arguments.length) return colour;
        colour = value;
        return chart;
    };

    chart.variable = function(value) {
        if (!arguments.length) return variable;
        variable = value;
        return chart;
    };

    chart.category = function(value) {
        if (!arguments.length) return category;
        category = value;
        return chart;
    };

    return chart;
}

// function to get the heatmap weightings of each station, based on count compared to max station count
function getHeatMapData(stationLatLongMap, stationsCount){

    let heatData = [];

    let popularStation = getMostPopularStation(stationsCount);

    for (let key in stationLatLongMap) {
        if (stationLatLongMap.hasOwnProperty(key)) {

            let latLong = stationLatLongMap[key];

            heatData.push({location: new google.maps.LatLng(latLong[0], latLong[1]),
                weight: (stationsCount[key]/stationsCount[popularStation]) * 10000});

        }
    }

    return heatData;
}

//initializes map using google maps api
function initMap(popularStartLoc, popularEndLoc,stationLatLongMap, startStationsCount, endStationsCount) {

    let startLoc = {lat: popularStartLoc[0], lng: popularStartLoc[1]};
    let endLoc = {lat: popularEndLoc[0], lng: popularEndLoc[1]};

    startStationData = getHeatMapData(stationLatLongMap, startStationsCount);
    endStationData = getHeatMapData(stationLatLongMap, endStationsCount);

    map = new google.maps.Map(document.getElementById('map'), {
        center: startLoc,
        zoom: 20
    });

    heatmap = new google.maps.visualization.HeatmapLayer({
        data: startStationData,
        dissipating: true,
        maxIntensity: 10000,
        opacity: 1,
        radius: 15
    });
    heatmap.setMap(map);
    stationMarkers.push(new google.maps.Marker({position: startLoc, map: map}));
    stationMarkers.push(new google.maps.Marker({position: endLoc, map: map}));
    stationMarkers[1].setMap(null);
    document.getElementById("popularStationText").innerHTML = "Most popular start station: " + popularStartStationName;
}

//function to change heatmap data to start station data
function displayStartData(){
    if (!firstDataMap) {
        heatmap.setData(startStationData);
        map.setCenter(new google.maps.LatLng(popularStartLoc[0], popularStartLoc[1]));
        document.getElementById("popularStationText").innerHTML = "Most popular start station: " + popularStartStationName;
        stationMarkers[1].setMap(null);
        stationMarkers[0].setMap(map);
        firstDataMap = true;
    }
}

//function to change heatmap data to end station data
function displayEndData(){
    if (firstDataMap) {
        heatmap.setData(endStationData);
        map.setCenter(new google.maps.LatLng(popularEndLoc[0], popularEndLoc[1]));
        document.getElementById("popularStationText").innerHTML = "Most popular end station: " + popularEndStationName;
        stationMarkers[0].setMap(null);
        stationMarkers[1].setMap(map);
        firstDataMap = false;
    }
}

//function to change bar chart to display number of riders per month
function displayNumTrips(){
    if(!countChart){
        d3.select("#vis").select("svg").remove();
        updateBarChart(splitArr[1], "Number of Trips: ");
        document.getElementById("barChartTitle").innerHTML = "Number of Trips Per Month";
        countChart = true;
        durationChart = false;
        monthlyChart = false;
        flexChart = false;
        walkUpChart = false;
    }
}

//function to change bar chart to display average duration of riders per month
function displayDuration(){
    if(!durationChart){
        d3.select("#vis").select("svg").remove();
        updateBarChart(splitArr[0], "Average Duration: ");
        document.getElementById("barChartTitle").innerHTML = "Average Duration of Trips Per Month (in seconds)";
        countChart = false;
        durationChart = true;
        monthlyChart = false;
        flexChart = false;
        walkUpChart = false;
    }
}

//function to change bar chart to display data for monthly passholder riders per month
function displayMonthly(){
    if(!monthlyChart){
        d3.select("#vis").select("svg").remove();
        updateBarChart(splitArr[2], "Monthly Passholders: ");
        document.getElementById("barChartTitle").innerHTML = "Monthly Passholders Per Month";
        countChart = false;
        durationChart = false;
        monthlyChart = true;
        flexChart = false;
        walkUpChart = false;
    }
}

//function to change bar chart to display data for flex passholder riders per month
function displayFlex(){
    if(!flexChart){
        d3.select("#vis").select("svg").remove();
        updateBarChart(splitArr[3], "Flex Passholders: ");
        document.getElementById("barChartTitle").innerHTML = "Flex Passholders Per Month";
        countChart = false;
        durationChart = false;
        monthlyChart = false;
        flexChart = true;
        walkUpChart = false;
    }
}

//function to change bar chart to display number of wal up riders per month
function displayWalkUp(){
    if(!walkUpChart){
        d3.select("#vis").select("svg").remove();
        updateBarChart(splitArr[4], "Number of Walk-Ups: ");
        document.getElementById("barChartTitle").innerHTML = "Walk-Up Bikers Per Month";
        countChart = false;
        durationChart = false;
        monthlyChart = false;
        flexChart = false;
        walkUpChart = true;
    }
}

//initializes bar chart
function updateBarChart(dataArray, message){
    let width = 800;
    let height = 600;

    let margin = {
        top: 10,
        bottom: 70,
        left: 70,
        right: 20
    };

    svgBar = d3.select('#vis')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    width = width - margin.left - margin.right;
    height = height - margin.top - margin.bottom;

    let x_scale = d3.scaleBand()
        .rangeRound([0, width])
        .padding(0.2);

    let y_scale = d3.scaleLinear()
        .range([height, 0]);

    let colour_scale = d3.scaleQuantile()
    // .range(["#ffffe5", "#fff7bc", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#993404", "#662506"]);
        .range(
            ["#fff7fb","#ece7f2","#d0d1e6","#a6bddb","#74a9cf","#3690c0","#0570b0","#045a8d","#023858"]);
// ["#ffffe5", "#edffff", "#9faefe", "#6a82fe", "#5f87fe", "#1046ec", "#092ccc", "#050699", "#120866"]

    let y_axis = d3.axisLeft(y_scale);
    let x_axis = d3.axisBottom(x_scale);

    svgBar.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')');

    svgBar.append('g')
        .attr('class', 'y axis');

    let tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            //4260ff
            // console.log(d);
            return "<strong>" + message + "</strong> <span style='color:#ffffff'>" + d.value + "</span>";
        });

    svgBar.call(tip);

    let t = d3.transition()
        .duration(1500);

    let months = ["Jul. 2016","Aug. 2016","Sep. 2016","Oct. 2016","Nov. 2016", "Dec. 2016","Jan. 2017", "Feb. 2017", "Mar. 2017"];

    let max_value = 0;

    let i;

    for(i = 0; i < dataArray.length; i++){
        max_value = Math.max(dataArray[i],max_value);
    }

    x_scale.domain(months);
    y_scale.domain([0,max_value]);
    colour_scale.domain([0, max_value]);

    let yearMonthData = [];

    for(i = 0; i < dataArray.length; i++){
        yearMonthData.push({
            month: months[i],
            value: dataArray[i]
        });
    }

    let bars = svgBar.selectAll('.bar').data(yearMonthData);
    bars.exit().remove();

    let new_bars = bars.enter().append('rect').attr('class', 'bar')
        .attr('height', 0)
        .attr('y', height)
        .attr('width', x_scale.bandwidth());

    new_bars.merge(bars)
        .transition(t)
        .attr('x', function(d) {
            return x_scale(d.month);
        })
        .attr('y', function(d) {
            return y_scale(d.value);
        })
        .attr('height', function(d) {
            return height - y_scale(d.value);
        })
        .attr('fill', function(d) {
            return colour_scale(d.value);
        });

    new_bars.on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    svgBar.select('.x.axis')
        .transition(t)
        .call(x_axis);

    svgBar.select('.y.axis')
        .transition(t)
        .call(y_axis);

}

function countPopularBikes(csvdata){
    let bikeCount = {};

    let i;
    for (i = 1; i < csvdata["data"].length-1; i++) {
        if (csvdata["data"][i][10].length !== 0) {

            let bikeId = parseInt(csvdata["data"][i][10]);

            if (bikeCount[bikeId] === undefined) {
                bikeCount[bikeId] = 1;
            }
            else {
                bikeCount[bikeId] += 1;
            }

        }
    }

    let sortedBikes = [];
    for (let bike in bikeCount) {
        sortedBikes.push([bike, bikeCount[bike]]);
    }

    sortedBikes.sort(function(a, b) {
        return b[1] - a[1];
    });

    return sortedBikes;
}

//function to get startDate, pass type and duration of trips for specific years and months
function seasonsData(csvdata){

    let i;

    let yearMap = {};
    for (i = 1; i < csvdata["data"].length-1; i++) {
        let startDate = new Date(csvdata["data"][i][2]);

        let month = startDate.getMonth()+1;
        let year = startDate.getFullYear();
        let duration = parseInt(csvdata["data"][i][1]);
        let pass = csvdata["data"][i][13];

        totalDurationInSeconds += duration;

        if (yearMap[year] === undefined) {
            yearMap[year] = {};
            yearMap[year][month] = {};
            yearMap[year][month]["numTrips"] = 1;
            yearMap[year][month]["totalDuration"] = 0;
            yearMap[year][month]["passType"] = {};
            yearMap[year][month]["passType"][pass] = 1;
        }
        else {

            let currentYearMap = yearMap[year];

            if(currentYearMap[month] === undefined){
                currentYearMap[month] = {};
                currentYearMap[month]["numTrips"] = 1;
                currentYearMap[month]["totalDuration"] = 0;
                currentYearMap[month]["passType"] = {};
                currentYearMap[month]["passType"][pass] = 1;
            }
            else{
                currentYearMap[month]["numTrips"] += 1;

                if (currentYearMap[month]["passType"] === undefined){
                    currentYearMap[month]["passType"] = {};
                }
                if(currentYearMap[month]["passType"][pass] === undefined){
                    currentYearMap[month]["passType"][pass] = 1;
                }
                else{
                    currentYearMap[month]["passType"][pass] += 1;
                }
            }

        }

        yearMap[year][month]["totalDuration"] += duration;

    }

    // console.log(yearMap);

    return yearMap;
}

function splitYearMapData(yearMapData){

    let averageDuration = [];
    let tripsPerMonth = [];

    let walkUp = [];
    let flex = [];
    let monthly = [];

    for (let year in yearMapData) {
        if (yearMapData.hasOwnProperty(year)) {

            let yearMap = yearMapData[year];
            // console.log(yearMap);
            for (let month in yearMap) {
                if (yearMap.hasOwnProperty(month)) {

                    let monthMap = yearMap[month];

                    let avg = Math.round(monthMap["totalDuration"]/monthMap["numTrips"] * 100) / 100;
                    averageDuration.push(avg);
                    tripsPerMonth.push(monthMap["numTrips"]);

                    for(let pass in monthMap["passType"]){

                        if (monthMap["passType"].hasOwnProperty(pass)){

                            if(pass === "Monthly Pass"){
                                monthly.push(monthMap["passType"][pass]);
                            }
                            else if(pass === "Flex Pass"){
                                flex.push(monthMap["passType"][pass]);
                            }
                            else if(pass === "Walk-up"){
                                walkUp.push(monthMap["passType"][pass]);
                            }

                        }
                    }

                }
            }

        }
    }

    return [averageDuration, tripsPerMonth, monthly, flex, walkUp];

}

//function to initialize object for line chart
function initStationTripHourMap(stationMap){

    for(let station in stationMap){

        if(stationMap.hasOwnProperty(station)){
            stationTripHourMap[station] = {};
            stationTripHourMap[station]["leave"] = {};
            stationTripHourMap[station]["arrive"] = {};

            let i;
            for(i = 0; i < 24; i++){
                stationTripHourMap[station]["leave"][i] = 0;
                stationTripHourMap[station]["arrive"][i] = 0;
            }
        }

    }

}

//function to traverse through trip data and fill in line chart data with count of bikes leaving and arriving per station
function fillStationTripHourMap(csvdata){

    let i;

    for (i = 1; i < csvdata["data"].length-1; i++) {

        if(csvdata["data"][i][4].length !== 0 && csvdata["data"][i][7].length !== 0 && csvdata["data"][i][2] !== 0
        && csvdata["data"][i][3].length !== 0){

            let startStationId = parseInt(csvdata["data"][i][4]);
            let endStationId = parseInt(csvdata["data"][i][7]);
            let startDate = new Date(csvdata["data"][i][2]);
            let endDate = new Date(csvdata["data"][i][3]);
            let startHour = startDate.getHours();
            let endHour = endDate.getHours();

            stationTripHourMap[startStationId]["leave"][startHour] += 1;
            stationTripHourMap[endStationId]["arrive"][endHour] += 1;

        }

    }

}

//function to initialize line chart for graphing net change
function makeLineChart(dataset, xName, yObjs, axisLables) {
    var chartObj = {};
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    chartObj.xAxisLable = axisLables.xAxis;
    chartObj.yAxisLable = axisLables.yAxis;

    chartObj.data = dataset;
    chartObj.margin = {top: 15, right: 60, bottom: 30, left: 50};
    chartObj.width = 650 - chartObj.margin.left - chartObj.margin.right;
    chartObj.height = 480 - chartObj.margin.top - chartObj.margin.bottom;

// So we can pass the x and y as strings when creating the function
    chartObj.xFunct = function(d){return d[xName]};

// For each yObjs argument, create a yFunction
    function getYFn(column) {
        return function (d) {
            return d[column];
        };
    }

// Object instead of array
    chartObj.yFuncts = [];
    for (var y  in yObjs) {
        yObjs[y].name = y;
        yObjs[y].yFunct = getYFn(yObjs[y].column); //Need this  list for the ymax function
        chartObj.yFuncts.push(yObjs[y].yFunct);
    }

//Formatter functions for the axes
    chartObj.formatAsNumber = d3.format(".0f");
    chartObj.formatAsDecimal = d3.format(".2f");
    chartObj.formatAsCurrency = d3.format("$.2f");
    chartObj.formatAsFloat = function (d) {
        if (d % 1 !== 0) {
            return d3.format(".2f")(d);
        } else {
            return d3.format(".0f")(d);
        }

    };

    chartObj.xFormatter = chartObj.formatAsNumber;
    chartObj.yFormatter = chartObj.formatAsNumber;

    chartObj.bisectYear = d3.bisector(chartObj.xFunct).left; //< Can be overridden in definition

//Create scale functions
    chartObj.xScale = d3.scaleLinear().range([0, chartObj.width]).domain(d3.extent(chartObj.data, chartObj.xFunct)); //< Can be overridden in definition

// Get the max of every yFunct
    chartObj.max = function (fn) {
        return d3.max(chartObj.data, fn);
    };
    chartObj.yScale = d3.scaleLinear().range([chartObj.height, 0]).domain([0, d3.max(chartObj.yFuncts.map(chartObj.max))]);

    chartObj.formatAsYear = d3.format("");

//Create axis
    chartObj.xAxis = d3.axisBottom(chartObj.xScale).tickFormat(chartObj.xFormatter); //< Can be overridden in definition
    chartObj.yAxis = d3.axisLeft(chartObj.yScale).tickFormat(chartObj.yFormatter); //< Can be overridden in definition


// Build line building functions
    function getYScaleFn(yObj) {
        return function (d) {
            return chartObj.yScale(yObjs[yObj].yFunct(d));
        };
    }
    for (var yObj in yObjs) {
        yObjs[yObj].line = d3.line().curve(d3.curveLinear).x(function (d) {
            return chartObj.xScale(chartObj.xFunct(d));
        }).y(getYScaleFn(yObj));
    }

    chartObj.svg;

// Change chart size according to window size
    chartObj.update_svg_size = function () {
        chartObj.width = parseInt(chartObj.chartDiv.style("width"), 10) - (chartObj.margin.left + chartObj.margin.right);

        chartObj.height = parseInt(chartObj.chartDiv.style("height"), 10) - (chartObj.margin.top + chartObj.margin.bottom);

        /* Update the range of the scale with new width/height */
        chartObj.xScale.range([0, chartObj.width]);
        chartObj.yScale.range([chartObj.height, 0]);

        if (!chartObj.svg) {return false;}

        /* Else Update the axis with the new scale */
        chartObj.svg.select('.x.axis').attr("transform", "translate(0," + chartObj.height + ")").call(chartObj.xAxis);
        chartObj.svg.select('.x.axis .label').attr("x", chartObj.width / 2);

        chartObj.svg.select('.y.axis').transition(t).call(chartObj.yAxis);
        chartObj.svg.select('.y.axis .label').transition(t).attr("x", -chartObj.height / 2);

        /* Force D3 to recalculate and update the line */
        for (var y  in yObjs) {
            yObjs[y].path.attr("d", yObjs[y].line);
        }


        d3.selectAll(".focus.line").attr("y2", chartObj.height);

        chartObj.chartDiv.select('svg').attr("width", chartObj.width + (chartObj.margin.left + chartObj.margin.right)).attr("height", chartObj.height + (chartObj.margin.top + chartObj.margin.bottom));

        chartObj.svg.select(".overlay").attr("width", chartObj.width).attr("height", chartObj.height);
        return chartObj;
    };

    chartObj.bind = function (selector) {

        chartObj.mainDiv = d3.select(selector);
        // Add all the divs to make it centered and responsive
        chartObj.mainDiv.append("div").attr("class", "inner-wrapper").append("div").attr("class", "outer-box").append("div").attr("class", "inner-box");
        chartSelector = selector + " .inner-box";
        chartObj.chartDiv = d3.select(chartSelector);
        d3.select(window).on('resize.' + chartSelector, chartObj.update_svg_size);
        chartObj.update_svg_size();
        return chartObj;
    };

// Render the chart
    chartObj.render = function () {
        //Create SVG element

        chartObj.svg = chartObj.chartDiv.append("svg").attr("class", "chart-area").attr("width", chartObj.width + (chartObj.margin.left + chartObj.margin.right)).attr("height", chartObj.height + (chartObj.margin.top + chartObj.margin.bottom)).append("g").attr("transform", "translate(" + chartObj.margin.left + "," + chartObj.margin.top + ")");

        // Draw Lines
        for (var y  in yObjs) {
            yObjs[y].path = chartObj.svg.append("path").datum(chartObj.data).attr("class", "line").attr("d", yObjs[y].line).style("stroke", color(y)).attr("data-series", y).on("mouseover", function () {
                focus.style("display", null);
            }).on("mouseout", function () {
                focus.transition(t).delay(700).style("display", "none");
            }).on("mousemove", mousemove);
        }


        // Draw Axis
        chartObj.svg.append("g").attr("class", "x axis").attr("transform", "translate(0," + chartObj.height + ")").call(chartObj.xAxis).append("text").attr("class", "label").attr("x", chartObj.width / 2).attr("y", 30).style("text-anchor", "middle").style("fill","white").text(chartObj.xAxisLable);

        chartObj.svg.append("g").attr("class", "y axis").call(chartObj.yAxis).append("text").attr("class", "label").attr("transform", "rotate(-90)").attr("y", -42).attr("x", -chartObj.height / 2).attr("dy", ".71em").style("text-anchor", "middle").style("fill","white").text(chartObj.yAxisLable);

        //Draw tooltips
        var focus = chartObj.svg.append("g").attr("class", "focus").style("display", "none");

        for (var y  in yObjs) {
            yObjs[y].tooltip = focus.append("g");
            yObjs[y].tooltip.append("circle").attr("r", 5);
            yObjs[y].tooltip.append("rect").attr("x", 8).attr("y","-5").attr("width",22).attr("height",'0.75em');
            yObjs[y].tooltip.append("text").attr("x", 9).attr("dy", ".35em");
        }

        // Year label
        focus.append("text").attr("class", "focus year").attr("x", 9).attr("y", 7);
        // Focus line
        focus.append("line").attr("class", "focus line").attr("y1", 0).attr("y2", chartObj.height);

        //Draw legend
        var legend = chartObj.mainDiv.append('div').attr("class", "legend");
        for (var y  in yObjs) {
            series = legend.append('div');
            series.append('div').attr("class", "series-marker").style("background-color", color(y));
            series.append('p').text(y);
            yObjs[y].legend = series;
        }

        // Overlay to capture hover
        chartObj.svg.append("rect").attr("class", "overlay").attr("width", chartObj.width).attr("height", chartObj.height).on("mouseover", function () {
            focus.style("display", null);
        }).on("mouseout", function () {
            focus.style("display", "none");
        }).on("mousemove", mousemove);

        return chartObj;
        function mousemove() {
            var x0 = chartObj.xScale.invert(d3.mouse(this)[0]), i = chartObj.bisectYear(dataset, x0, 1), d0 = chartObj.data[i - 1], d1 = chartObj.data[i];
            try {
                var d = x0 - chartObj.xFunct(d0) > chartObj.xFunct(d1) - x0 ? d1 : d0;
            } catch (e) { return;}
            minY = chartObj.height;
            for (var y  in yObjs) {
                yObjs[y].tooltip.attr("transform", "translate(" + chartObj.xScale(chartObj.xFunct(d)) + "," + chartObj.yScale(yObjs[y].yFunct(d)) + ")");
                yObjs[y].tooltip.select("text").text(chartObj.yFormatter(yObjs[y].yFunct(d)));
                minY = Math.min(minY, chartObj.yScale(yObjs[y].yFunct(d)));
            }

            focus.select(".focus.line").attr("transform", "translate(" + chartObj.xScale(chartObj.xFunct(d)) + ")").attr("y1", minY);
            focus.select(".focus.year").text("Time: " + chartObj.xFormatter(chartObj.xFunct(d)) + ":00").style("fill","white");
        }

    };
    return chartObj;
}

//function to get line chart data from map created from fillStationTripHourMap
function getLineChartData(){

    let lineChartData = {};

    for (let stationId in stationTripHourMap){

        let objArr = [];

        let i;
        for(i = 0; i < 24; i++){
            let obj = {};
            obj["timeHour"] = i+1;
            obj["leave"] = stationTripHourMap[stationId]["leave"][i];
            obj["arrive"] = stationTripHourMap[stationId]["arrive"][i];
            objArr.push(obj);
        }

        lineChartData[stationId] = objArr;

    }

    return lineChartData;

}

//function to update line chart based on selection from drop down menu
function updateLineChart(data){
    chart = makeLineChart(data, 'timeHour', {
        'Bikes leaving station': {column: 'leave'},
        'Bikes arriving at station': {column: 'arrive'}
    }, {xAxis: "Hour", yAxis: "Number of Bikes"});
    chart.bind("#chart-line1");
    chart.render();
}

//function to remove current line graph and replace it with a new station's net change data
function removeLine(value){
    d3.select("#chart-line1").selectAll("svg").remove();
    d3.select("#chart-line1").selectAll("div").remove();
    updateLineChart(dataLineChart[parseInt(value)]);
}

//function to get mapping of stationID to station street names
function mapStationIdToName(nameFile, id){

    id = parseInt(id);

    let i;

    for(i = 0; i < nameFile["data"].length-1; i++){
        let stationId = parseInt(nameFile["data"][i]["Station_ID"]);

        if(stationId === id){
            return nameFile["data"][i]["Station_Name"];
        }
    }

    return null;
}

//function to fill the net change section's select box with all station names
function fillSelectBox(nameFile,stationList){

    let sel = document.getElementById('stationSelect');

    for(let stationId in stationList){

        if(stationList.hasOwnProperty(stationId)){

            let stationName = mapStationIdToName(nameFile, stationId);
            if(stationName === null){
                if(parseInt(stationId) === 3009){
                    stationName = "Windward";
                }
                else if(parseInt(stationId) === 3039){
                    stationName = "Culver Blvd";
                }
            }
            let opt = document.createElement('option');
            opt.innerHTML = stationName;
            opt.value = stationId;
            sel.appendChild(opt);
        }

    }

}

//parse trips data csv file using papa parse
$.get(fileName, function (data) {
    let csvdata = Papa.parse(data);

    //parse through station names file
    $.get(stationNames, function (nameData) {
        nameFile = Papa.parse(nameData, {
            header: true
        });

        totalTrips = csvdata["data"].length;

        //heat map for station popularity
        let stationLatLongMap = getStationLatLongMap(csvdata);
        let startStationsCount = stationCountMap(csvdata,4);
        let endStationsCount = stationCountMap(csvdata,7);

        let startStation = getMostPopularStation(startStationsCount);
        popularStartStationName = mapStationIdToName(nameFile, startStation);
        popularStartLoc = stationLatLongMap[startStation];

        let endStation = getMostPopularStation(endStationsCount);
        popularEndStationName = mapStationIdToName(nameFile, endStation);
        popularEndLoc = stationLatLongMap[endStation];

        initMap(popularStartLoc,popularEndLoc,stationLatLongMap, startStationsCount, endStationsCount);

        //net change multi line chart
        initStationTripHourMap(startStationsCount);
        fillStationTripHourMap(csvdata);
        dataLineChart = getLineChartData();
        fillSelectBox(nameFile, startStationsCount);
        updateLineChart(dataLineChart[3000]);

        //pie chart for passholder breakdown
        d3PieChart(countRegularRiders(csvdata));

        //bar charts for ridership change per month
        let yearDataMap = seasonsData(csvdata);
        splitArr = splitYearMapData(yearDataMap);
        updateBarChart(splitArr[1], "Number of Trips: ");
        document.getElementById("barChartTitle").innerHTML = "Number of Trips Per Month";

        //average distance
        getAverageDistance(csvdata);
    })

});

//jquery to update line chart based on selected option from select menu
$(document).ready(function(){
    $('select#stationSelect').change(function() {
        let theValue = $('option:selected').val();
        removeLine(theValue);
    });
});

$(document).on('click', 'a[href^="#"]', function (event) {
    event.preventDefault();

    $('html, body').animate({
        scrollTop: $($.attr(this, 'href')).offset().top
    }, 500);
});