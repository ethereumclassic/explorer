angular.module('BlocksApp').controller('StatsController', function($stateParams, $rootScope, $scope) {

    $rootScope.isHome = false;
    $scope.settings = $rootScope.setup;

    /*
      Chart types:
        hashrate: Hashrate Growth
        miner_hashrate: Miner Hashrate Distribution
    */

    const CHART_TYPES = {
        "hashrate": {
            "title": "Hashrate chart"
        },
        "blocktime": {
            "title": "Blocktime chart"
        },
        "difficulty": {
            "title": "Difficulty chart"
        },
        "miner_hashrate": {
            "title": "Miner distribution"
        }
    }

    $rootScope.$state.current.data["pageSubTitle"] = CHART_TYPES[$stateParams.chart].title;
    $scope.chart = $stateParams.chart;

})
.directive('minersHashrate', function($http) {
  return {
    restrict: 'E',
    template: '<svg id="hashrate" width="100%" height="500px"></svg>',
    scope: true,
    link: function(scope, elem, attrs) {
      scope.stats = {};
      var statsURL = "/stats";

      $http.post(statsURL, {"action": "miners"})
        .then(function(res) {
          var data = _.sortBy(res.data, function(d) {
            //console.log(d.count);
            return d.count;
          });
          scope.init(data, "#hashrate");
        });

      /**
       * Created by chenxiangyu on 2016/8/5.
       */
      scope.init = function(dataset, chartid) {
        var total = 0;
        dataset.forEach(function(d) {
          total += d.count;
        });

        var svg = d3.select(chartid)
          .append("g");


        svg.append("g")
            .attr("class", "slices");
        svg.append("g")
            .attr("class", "labelName");
        svg.append("g")
            .attr("class", "labelValue");
        svg.append("g")
            .attr("class", "lines");

        var width = parseInt(d3.select(chartid).style("width"));
        var height = parseInt(d3.select(chartid).style("height"));

        // fix for mobile layout
        var radius;
        if (window.innerWidth < 800) {
            radius = Math.min(width, 450) * 0.6;
        } else {
            radius = 450 * 0.5;
        }

        var pie = d3.layout.pie()
            .sort(null)
            .value(function (d) {
                //return d.value;
                //console.log(d);
                return d.count;
            });

        var arc = d3.svg.arc()
            .outerRadius(radius * 0.8)
            .innerRadius(radius * 0.4);

        var outerArc = d3.svg.arc()
            .innerRadius(radius * 0.9)
            .outerRadius(radius * 0.9);

        var legendRectSize = (radius * 0.05);
        var legendSpacing = radius * 0.02;

        var maxMiners = 23;
        if (window.innerWidth < 800) {
            var legendHeight = legendRectSize + legendSpacing;
            var fixHeight = Math.min(maxMiners, dataset.length) * legendHeight;
            fixHeight = height + parseInt(fixHeight) + 50;
            d3.select(chartid).attr("height", fixHeight + 'px');
        }

        var div = d3.select("body").append("div").attr("class", "toolTip");

        // fix for mobile layout
        if (window.innerWidth < 800) {
            svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
        } else {
            svg.attr("transform", "translate(" + 200 + "," + 200 + ")");
        }

        var colorRange = d3.scale.category20();
        var color = d3.scale.ordinal()
            .range(colorRange.range());

        change(dataset);


        d3.selectAll("input")
            .on("change", selectDataset);

        function selectDataset() {
            var value = this.value;
            if (value == "total") {
                change(datasetTotal);
            }
        }

        function change(data) {
            //console.log(data);

            /* ------- PIE SLICES -------*/
            var slice = svg.select(".slices").selectAll("path.slice")
                .data(pie(data), function (d) {
                    //return d.data.label
                    //console.log(d);
                    return d.data._id;
                });

            slice.enter()
                .insert("path")
                .style("fill", function (d) {
                    return color(d.data._id);
                })
                .attr("class", "slice");

            slice
                .transition().duration(1000)
                .attrTween("d", function (d) {
                    this._current = this._current || d;
                    var interpolate = d3.interpolate(this._current, d);
                    this._current = interpolate(0);
                    return function (t) {
                        return arc(interpolate(t));
                    };
                })
            slice
                .on("mousemove", function (d) {
                    div.style("left", d3.event.pageX + 10 + "px");
                    div.style("top", d3.event.pageY - 25 + "px");
                    div.style("display", "inline-block");
                    div.html((d.data._id) + "<br>" + (d.data.count) + "<br>(" + d3.format(".2%")(d.data.count / total) + ")");
                });
            slice
                .on("mouseout", function (d) {
                    div.style("display", "none");
                });

            slice.exit()
                .remove();

                //console.log(data.length);

            var legendHeight = Math.min(maxMiners, color.domain().length);
            var legend = svg.selectAll('.legend')
                //.data(color.domain())
                .data(data)
                .enter()
                .append('g')
                .attr('class', 'legend')
                .attr('transform', function (d, i) {
                    if (data.length - i >= maxMiners) {
                        // show maxMiners, hide remains
                        return 'translate(2000,0)';
                    }
                    var height = legendRectSize + legendSpacing;
                    var offset = height * legendHeight / 2;
                    var horz = -3 * legendRectSize;
                    var vert = (data.length - i) * height;
                    var tx, ty;
                    if (window.innerWidth > 800) {
                       tx = 250;
                       ty = vert - offset;
                    } else {
                       tx = - radius * 0.8;
                       ty = vert + radius;
                    }
                    return 'translate(' + tx + ',' + ty + ')';
                });

            legend.append('rect')
                .attr('width', legendRectSize)
                .attr('height', legendRectSize)
                .style('fill', function (d,i) {
                    //console.log(i);
                    return color(d._id);
                });

            legend.append('text')

                .attr('x', legendRectSize + legendSpacing)
                .attr('y', legendRectSize - legendSpacing)
                .text(function (d) {
                    //console.log(d);
                    return d._id;
                });


        }
      }
    }
  };
})
.directive('networkHashrate', function($http) {
  return {
    restrict: 'E',
    template: '<svg id="hashrates" width="100%" height="500px"></svg>',
    scope: true,
    link: function(scope, elem, attrs) {
      $http.post("/stats", {"action": "hashrates"})
        .then(function(res) {
          //console.log(res.data);

          scope.init(res.data, "#hashrates");
        });

      /**
       * Created by chenxiangyu on 2016/8/5.
       */
      scope.init = function(dataset, chartid) {
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
            /*
            request('http://drawpie.com/etc_hash_rate_api', function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    var hashrate = JSON.parse(body);
                    //console.log(hashrate);
                    callback(null, hashrate, 'two');
                }
            });
            */
            callback(null, dataset, 'two');
            //callback(null, 'one', 'two');
        }


        function mySecondFunction(arg1, arg2, callback) {
            // arg1 now equals 'one' and arg2 now equals 'two'

            //console.log(window.screen.availWidth);
            var width1 = parseInt(d3.select(chartid).style("width"));

            var margin = {top: 0, right: 10, bottom: 50, left: 65},
                //var margin = {top: 30, right: 0, bottom: 0, left: 0},
                // For Responsive web design, get window.innerWidth
                //width = window.innerWidth - margin.left - margin.right,
                width = width1 - margin.left - margin.right,
                //width = window.screen.availWidth - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            // FIXME
            if (width < 0) {
                width = 1000;
            }

            var x = d3.time.scale().range([0, width]);
            var y = d3.scale.linear().range([height, 0]);

            // For Responsive web design
            var tick = window.innerWidth < 800 ? 2:5;

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                //.tickFormat(d3.time.format("%x %H:%M"))
                .tickFormat(d3.time.format("%x"))
                .ticks(tick);




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

            var svg = d3.select(chartid)
            //.append("svg")
                .attr("width", width + margin.left + margin.right)

                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

            // fix for mobile layout
            var tick = window.innerWidth < 800 ? 15:30;

            // function for the x grid lines
            function make_x_axis() {
                return d3.svg.axis()
                    .scale(x)
                    .orient("bottom")
                    .ticks(tick)
            }

            // function for the y grid lines
            function make_y_axis() {
                return d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .ticks(8)
            }



            var data = arg1.hashrates;

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

            var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .direction('s')
                .html(function(d) {
                    return '<div class="tooltip-arrow"></div>' +
                        '<div class="tooltip-inner"><div class="small"><b>' +
                        'Hashrate: <b>' + d3.format(".5s")(d.instantHashrate) + 'H/s </b><br />' +
                        '<b>' + d3.time.format("%x %H:%M")(new Date(d.unixtime * 1000)) + '</b>' +
                        '</div></div>';
                });

            // Add Tooltip
            var focus = svg.append("g")
                .attr("class", "focus")
                .style("display", "none");

            focus.append("circle")
                .attr("r", 4.5);

            focus.append("text")
                .attr("x", 9)
                .attr("dy", ".35em");

            svg.call(tip);

            svg.append("rect")
                .attr("class", "overlay")
                .attr("width", width)
                .attr("height", height)
                .on("mouseover", function() {
                    var x0 = x.invert(d3.mouse(this)[0]);
                    var s1 = _.minBy(data, function(d) {
                        return Math.abs(moment(x0).unix()-d.unixtime);
                    });
                    tip.show(s1, this);
                    tip.style("left", d3.event.pageX + 10 + "px");
                    tip.style("top", d3.event.pageY + 25 + "px");
                    focus.style("display", null);
                 })
                .on("mouseout", function() { tip.hide(); focus.style("display", "none"); })
                .on("mousemove", mousemove);


            function mousemove() {
                var x0 = x.invert(d3.mouse(this)[0]);
                //console.log(moment(x0).unix());

                var s1 = _.minBy(data, function(d) {
                    //console.log(d.unixtime);
                    return Math.abs(moment(x0).unix()-d.unixtime);
                });

                //console.log(moment(s1.unixtime*1000).format());
                //console.log(s1.instantHashrate);

                tip.show(s1, this);
                tip.style("left", d3.event.pageX + 10 + "px");
                tip.style("top", d3.event.pageY + 25 + "px");

                //focus.attr("transform", "translate(" + x(d.date) + "," + y(d.close) + ")");
                focus.attr("transform", "translate(" + x(moment(x0).unix()*1000) + "," + y(s1.instantHashrate) + ")");
            }




            callback(null, 'three');
        }
        function myLastFunction(arg1, callback) {
            // arg1 now equals 'three'
            callback(null, 'done');
        }
      }
    }
  }
})
.directive('difficultyChart', function($http) {
  return {
    restrict: 'E',
    template: '<svg id="difficulty" width="100%" height="500px"></svg>',
    scope: true,
    link: function(scope, elem, attrs) {
      $http.post("/stats", {"action": "hashrates"})
        .then(function(res) {
          scope.init(res.data, "#difficulty");
        });

      /**
       * Created by chenxiangyu on 2016/8/5.
       * slightly modified to show difficulty chart.
       */
      scope.init = function(dataset, chartid) {
        async.waterfall([
            myFirstFunction,
            mySecondFunction,
            myLastFunction
        ], function (err, result) {
            // result now equals 'done'
            return result;
        });

        function myFirstFunction(callback) {
            callback(null, dataset, 'two');
        }

        function mySecondFunction(arg1, arg2, callback) {
            var width1 = parseInt(d3.select(chartid).style("width"));

            var margin = {top: 0, right: 10, bottom: 50, left: 65},
                //var margin = {top: 30, right: 0, bottom: 0, left: 0},
                // For Responsive web design, get window.innerWidth
                //width = window.innerWidth - margin.left - margin.right,
                width = width1 - margin.left - margin.right,
                //width = window.screen.availWidth - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            // FIXME
            if (width < 0) {
                width = 1000;
            }

            var x = d3.time.scale().range([0, width]);
            var y = d3.scale.linear().range([height, 0]);

            // For Responsive web design
            var tick = window.innerWidth < 800 ? 2:5;

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickFormat(d3.time.format("%x"))
                .ticks(tick);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickFormat(d3.format("s"))
                .tickFormat(function(d){return d3.format("s")(d) + 'H';})
                .ticks(5);

            var area = d3.svg.area()
                .x(function(d) { return x(d.timestamp*1000); })
                .y0(height)
                .y1(function(d) { return y(parseInt(d.difficulty)); });

            var valueline = d3.svg.line()
                .x(function(d) { return x(d.timestamp*1000); })
                .y(function(d) { return y(parseInt(d.difficulty)); });

            var svg = d3.select(chartid)
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

            // fix for mobile layout
            var tick = window.innerWidth < 800 ? 15:30;

            // function for the x grid lines
            function make_x_axis() {
                return d3.svg.axis()
                    .scale(x)
                    .orient("bottom")
                    .ticks(tick)
            }

            // function for the y grid lines
            function make_y_axis() {
                return d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .ticks(8)
            }

            var data = arg1.hashrates;

            // Scale the range of the data
            x.domain(d3.extent(data, function(d) { return d.timestamp*1000; }));
            y.domain([d3.min(data, function(d) { return parseInt(d.difficulty); }), d3.max(data, function(d) { return parseInt(d.difficulty); })]);

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

            var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .direction('s')
                .html(function(d) {
                    return '<div class="tooltip-arrow"></div>' +
                        '<div class="tooltip-inner"><div class="small"><b>' +
                        'Difficulty: <b>' + d3.format(".5s")(d.difficulty) + 'H </b><br />' +
                        '<b>' + d3.time.format("%x %H:%M")(new Date(d.unixtime * 1000)) + '</b>' +
                        '</div></div>';
                });

            // Add Tooltip
            var focus = svg.append("g")
                .attr("class", "focus")
                .style("display", "none");

            focus.append("circle")
                .attr("r", 4.5);

            focus.append("text")
                .attr("x", 9)
                .attr("dy", ".35em");

            svg.call(tip);

            svg.append("rect")
                .attr("class", "overlay")
                .attr("width", width)
                .attr("height", height)
                .on("mouseover", function() {
                    var x0 = x.invert(d3.mouse(this)[0]);
                    var s1 = _.minBy(data, function(d) {
                        return Math.abs(moment(x0).unix()-d.unixtime);
                    });
                    tip.show(s1, this);
                    tip.style("left", d3.event.pageX + 10 + "px");
                    tip.style("top", d3.event.pageY + 25 + "px");
                    focus.style("display", null);
                 })
                .on("mouseout", function() { tip.hide(); focus.style("display", "none"); })
                .on("mousemove", mousemove);

            function mousemove() {
                var x0 = x.invert(d3.mouse(this)[0]);

                var s1 = _.minBy(data, function(d) {
                    return Math.abs(moment(x0).unix()-d.unixtime);
                });

                tip.show(s1, this);
                tip.style("left", d3.event.pageX + 10 + "px");
                tip.style("top", d3.event.pageY + 25 + "px");

                //focus.attr("transform", "translate(" + x(d.date) + "," + y(d.close) + ")");
                focus.attr("transform", "translate(" + x(moment(x0).unix()*1000) + "," + y(s1.difficulty) + ")");
            }

            callback(null, 'three');
        }
        function myLastFunction(arg1, callback) {
            // arg1 now equals 'three'
            callback(null, 'done');
        }
      }
    }
  }
})
.directive('blocktimeChart', function($http) {
  return {
    restrict: 'E',
    template: '<svg id="blocktime" width="100%" height="500px"></svg>',
    scope: true,
    link: function(scope, elem, attrs) {
      $http.post("/stats", {"action": "hashrates"})
        .then(function(res) {

          scope.init(res.data, "#blocktime");
        });

      /**
       * Created by chenxiangyu on 2016/8/5
       * slightly modified for blocktime.
       */
      scope.init = function(dataset, chartid) {
        async.waterfall([
            myFirstFunction,
            mySecondFunction,
            myLastFunction
        ], function (err, result) {
            // result now equals 'done'
            return result;
        });

        function myFirstFunction(callback) {
            callback(null, dataset, 'two');
        }

        function mySecondFunction(arg1, arg2, callback) {
            var width1 = parseInt(d3.select(chartid).style("width"));

            var margin = {top: 0, right: 10, bottom: 50, left: 65},
                //var margin = {top: 30, right: 0, bottom: 0, left: 0},
                // For Responsive web design, get window.innerWidth
                //width = window.innerWidth - margin.left - margin.right,
                width = width1 - margin.left - margin.right,
                //width = window.screen.availWidth - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            // FIXME
            if (width < 0) {
                width = 1000;
            }

            var x = d3.time.scale().range([0, width]);
            var y = d3.scale.linear().range([height, 0]);

            // For Responsive web design
            var tick = window.innerWidth < 800 ? 2:5;

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickFormat(d3.time.format("%x"))
                .ticks(tick);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickFormat(d3.format("s"))
                .tickFormat(function(d){return d3.format("s")(d) + ' sec';})
                .ticks(5);

            var area = d3.svg.area()
                .x(function(d) { return x(d.timestamp*1000); })
                .y0(height)
                .y1(function(d) { return y(d.blockTime); });

            var valueline = d3.svg.line()
                .x(function(d) { return x(d.timestamp*1000); })
                .y(function(d) { return y(d.blockTime); });

            var svg = d3.select(chartid)
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

            // fix for mobile layout
            var tick = window.innerWidth < 800 ? 15:30;

            // function for the x grid lines
            function make_x_axis() {
                return d3.svg.axis()
                    .scale(x)
                    .orient("bottom")
                    .ticks(tick)
            }

            // function for the y grid lines
            function make_y_axis() {
                return d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .ticks(8)
            }

            var data = arg1.hashrates;

            // Scale the range of the data
            x.domain(d3.extent(data, function(d) { return d.timestamp*1000; }));
            y.domain([d3.min(data, function(d) { return d.blockTime; }), d3.max(data, function(d) { return d.blockTime; })]);

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

            var tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .direction('s')
                .html(function(d) {
                    return '<div class="tooltip-arrow"></div>' +
                        '<div class="tooltip-inner"><div class="small"><b>' +
                        'Blocktime: <b>' + d3.format(".4s")(d.blockTime) + ' sec </b><br />' +
                        '<b>' + d3.time.format("%x %H:%M")(new Date(d.unixtime * 1000)) + '</b>' +
                        '</div></div>';
                });

            // Add Tooltip
            var focus = svg.append("g")
                .attr("class", "focus")
                .style("display", "none");

            focus.append("circle")
                .attr("r", 4.5);

            focus.append("text")
                .attr("x", 9)
                .attr("dy", ".35em");

            svg.call(tip);

            svg.append("rect")
                .attr("class", "overlay")
                .attr("width", width)
                .attr("height", height)
                .on("mouseover", function() {
                    var x0 = x.invert(d3.mouse(this)[0]);
                    var s1 = _.minBy(data, function(d) {
                        return Math.abs(moment(x0).unix()-d.unixtime);
                    });
                    tip.show(s1, this);
                    tip.style("left", d3.event.pageX + 10 + "px");
                    tip.style("top", d3.event.pageY + 25 + "px");
                    focus.style("display", null);
                 })
                .on("mouseout", function() { tip.hide(); focus.style("display", "none"); })
                .on("mousemove", mousemove);

            function mousemove() {
                var x0 = x.invert(d3.mouse(this)[0]);

                var s1 = _.minBy(data, function(d) {
                    return Math.abs(moment(x0).unix()-d.unixtime);
                });

                tip.show(s1, this);
                tip.style("left", d3.event.pageX + 10 + "px");
                tip.style("top", d3.event.pageY + 25 + "px");

                focus.attr("transform", "translate(" + x(moment(x0).unix()*1000) + "," + y(s1.blockTime) + ")");
            }

            callback(null, 'three');
        }
        function myLastFunction(arg1, callback) {
            // arg1 now equals 'three'
            callback(null, 'done');
        }
      }
    }
  }
});
