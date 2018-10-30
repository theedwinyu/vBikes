# vBikes
Visualizing Los Angeles Bike share data from July 2016 to March 2017

# Features #
1. Station Popularity
    * Heatmap displaying the popularity of each starting and ending bike station in LA
    
2. Monthly Trends
    * Bar charts analyzing how ridership changes throughout the year.
    * Click on buttons to see relationship between the types of passes used, average trip duration, and number of trips per month

3. Passholder Breakdown
    * Displays the number of riders who include bike sharing as a regular part of their commute
        * Assumed that all pass types, excluding "Walk-up," signify regular riders
    * Donut chart showing the ratio of pass holder types
    * Hover over each section of the chart to see the exact count and the breakdown of each Trip Route Category-Passholder type combination

4. Average Distance
    * Calculating the average distance of one way trips
        * Used the Haversine Formula on the latitude and longitudes of starting and ending stations
    * Calculating the average distance of round trips
        * Assumed the the average biker travels at 6 miles per hour
        * Multiplied my assumed average speed by the total duration of all one way trips
    * Calculated the combined average by taking a weighted average of the two

5. Net Change in Bikes per Station
    * Multi-Line chart displaying the net change of bike trips per station throughout the course of a day
    * Found the number of bikes leaving and arriving ****at a specific station and graphed the difference
    * Can change the currently graphed station by using the drop-down menu

# Built with #
* Javascript, HTML, and CSS to build the website
* D3.js for the Bar Charts, Donut Chart, and the Multi-Line Chart
* Google Maps Visualization API for the Heatmap
* Papa Parse to parse the csv files