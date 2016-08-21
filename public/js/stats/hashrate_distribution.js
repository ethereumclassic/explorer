// http://bl.ocks.org/juan-cb/1984c7f2b446fffeedde

//console.log('OK2');
var _ = require('lodash');

var data = {};
data.title = "title";
data.message = "message";
data.action = "miners";

$.ajax({
    type: 'POST',
    data: JSON.stringify(data),
    contentType: 'application/json',
    url: 'http://127.0.0.1:3000/stats',
    success: function(data) {
        //console.log(data);
        var data = JSON.parse(data);

        var data = _.sortBy(data, function(d) {
            //console.log(d.count);
            return d.count;
        });
        //console.log(data);
        saved_data = data;
        //console.log(JSON.stringify(data));
    }
});

window.call_hashrate_distribution = function() {


    var svg = d3.select("#hashrate_distribution")
        .append("g");


    svg.append("g")
        .attr("class", "slices");
    svg.append("g")
        .attr("class", "labelName");
    svg.append("g")
        .attr("class", "labelValue");
    svg.append("g")
        .attr("class", "lines");

    var width1 = parseInt(d3.select("#hashrate_distribution").style("width"));

    var width = width1,
        height = 1000,
        //radius = Math.min(width, height) / 2;
        radius = Math.min(960, 450) / 2;

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


    var div = d3.select("body").append("div").attr("class", "toolTip");

    svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    svg.attr("transform", "translate(" + 200 + "," + 200 + ")");

    var colorRange = d3.scale.category20();
    var color = d3.scale.ordinal()
        .range(colorRange.range());


    datasetTotal = saved_data;
    change(datasetTotal);


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
                div.html((d.data._id) + "<br>" + (d.data.count) + " ");
            });
        slice
            .on("mouseout", function (d) {
                div.style("display", "none");
            });

        slice.exit()
            .remove();

            //console.log(data.length);

        var legend = svg.selectAll('.legend')
            //.data(color.domain())
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                var height = legendRectSize + legendSpacing;
                var offset = height * color.domain().length / 2;
                var horz = -3 * legendRectSize;
                //var vert = i * height - offset;
                var vert = i * height - offset;
                return 'translate(' + 250 + ',' + vert + ')';
            });

        legend.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style('fill', function (d,i) {
                //console.log(i);
                return color(d._id);
            })
            .style('stroke', color);

        legend.append('text')

            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .text(function (d) {
                //console.log(d);
                return d._id;
            });


    };
}