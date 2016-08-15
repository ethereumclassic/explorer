/**
 * Created by chenxiangyu on 2016/8/5.
 */
var request = require('request');
var moment = require('moment');

window.call_hashrate_chart = function(){

    async.waterfall([
        myFirstFunction,
        mySecondFunction,
        myLastFunction
    ], function (err, result) {
        // result now equals 'done'
        //console.log("all done1");
        return result;
    });

    function myFirstFunction(callback) {


        request('http://drawpie.com/etc_hash_rate_api', function (error, response, body) {
            if (!error && response.statusCode == 200) {

                var hashrate = JSON.parse(body);
                //console.log(hashrate);
                callback(null, hashrate, 'two');
            }
        });



        //callback(null, 'one', 'two');
    }
    function mySecondFunction(arg1, arg2, callback) {
        // arg1 now equals 'one' and arg2 now equals 'two'

        //console.log(window.screen.availWidth);
        var width1 = parseInt(d3.select("#hashrate").style("width"));

        var margin = {top: 0, right: 50, bottom: 50, left: 100},
            //var margin = {top: 30, right: 0, bottom: 0, left: 0},
            // For Responsive web design, get window.innerWidth
            //width = window.innerWidth - margin.left - margin.right,
            width = width1 - margin.left - margin.right,
            //width = window.screen.availWidth - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        var x = d3.time.scale().range([0, width]);
        var y = d3.scale.linear().range([height, 0]);

        // For Responsive web design
        //When window.innerWidth < 800 , Reduce the ticks to 2


        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            //.tickFormat(d3.time.format("%x %H:%M"))
            .tickFormat(d3.time.format("%x"))
            .ticks(5);




        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .tickFormat(d3.format("s"))
            .tickFormat(function(d){return d3.format("s")(d) +'H/s';})
            .ticks(5);






        var area = d3.svg.area()
            .x(function(d) { return x(d.timestamp*1000); })
            .y0(height)
            .y1(function(d) { return y(d.instantHashrate); });

        var valueline = d3.svg.line()
            .x(function(d) { return x(d.timestamp*1000); })
            .y(function(d) { return y(d.instantHashrate); });

        var svg = d3.select("#hashrate")
        //.append("svg")
            .attr("width", width + margin.left + margin.right)

            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");




// function for the x grid lines
        function make_x_axis() {
            return d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .ticks(8)
        }

// function for the y grid lines
        function make_y_axis() {
            return d3.svg.axis()
                .scale(y)
                .orient("left")
                .ticks(8)
        }



        var data = arg1.etc_hashrate;

        // Scale the range of the data
        x.domain(d3.extent(data, function(d) { return d.timestamp*1000; }));
        y.domain([d3.min(data, function(d) { return d.instantHashrate; }), d3.max(data, function(d) { return d.instantHashrate; })]);

        // Add the filled area
        svg.append("path")
            .datum(data)
            .attr("class", "area")
            .attr("d", area);

        // Draw the x Grid lines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + height + ")")
            .call(make_x_axis()
                .tickSize(-height, 0, 0)
                .tickFormat("")
            );

        // Draw the y Grid lines
        svg.append("g")
            .attr("class", "grid")
            .call(make_y_axis()
                .tickSize(-width, 0, 0)
                .tickFormat("")
            );

        // Add the valueline path.
        svg.append("path")
            .attr("d", valueline(data));

        // Add the X Axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // Add the Y Axis
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        // Add the text label for the X axis
        /*
         svg.append("text")
         .attr("transform",
         "translate(" + (width/2) + " ," +
         (height+margin.bottom) + ")")
         .style("text-anchor", "middle")
         .text("Date");
         */
        /*

         // Add the title
         svg.append("text")
         .attr("x", (width / 2))
         .attr("y", 0 - (margin.top / 2))
         .attr("text-anchor", "middle")
         .style("font-size", "16px")
         .style("text-decoration", "underline")
         .text("ETC Hashrate");

         */

        callback(null, 'three');
    }
    function myLastFunction(arg1, callback) {
        // arg1 now equals 'three'
        callback(null, 'done');
    }



};

//call_hashrate_chart();