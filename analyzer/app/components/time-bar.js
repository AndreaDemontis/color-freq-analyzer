// @flow
import React, { Component } from 'react';
import * as D3 from 'd3'
import moment from 'moment'

// - Components
import SpectrumRanges from './spectrum-ranges';

// - Style
import style from "./time-bar.css";

export default class VideoTimeline extends Component
{

    constructor(props)
    {
        super(props)

        this.state =
        {
            // - State
            time: 0,

            // - Mouse controls
            hoverTime: 0,
			dragging: false,
			hovering: false,
        }

        this.drawChart = this.drawChart.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
    }

    render = () =>
        this.renderLayout(this.props.video, this.defaultStream(this.props.video.streams, "VIDEO"))

    renderLayout = (video, stream) =>
    (
        <div className={style.container}>
            <div className={style.timeline}>
                <div className={style.timeRight}>
                    <span className={style.time}>
                    {
    					moment().startOf('day')
    				    	.seconds(this.state.time)
    				    	.format('H:mm:ss:SSS')
    				}
                    </span><br/>
                <span className={style.frame}>{this.props.frame}F</span>
                </div>
                <div ref={e => this.container = e} style={{ width: "700px", height: "60px"}}>
                    <svg ref={e => this.el = e} />
                </div>
                <div className={style.timeLeft}>
                    <span className={style.time}>
                    -{
    					moment().startOf('day')
    				    	.seconds(video.duration - this.state.time)
    				    	.format('H:mm:ss:SSS')
    				}
                    </span>
                </div>
            </div>
        </div>
    )

    componentDidMount()
	{
        var that = this;
        var width = this.container.clientWidth;

        var triangle = D3.symbol()
            .type(D3.symbolTriangle)
            .size(40)

		this.svg = D3.select(this.el)
                    .attr("width", "100%")
                    .attr("height", 60)

                    // - Adds svg definitions
                    var svgDefs = this.svg.append('defs');

                    // - Define a gradient for the chart
                    var mainGradient = svgDefs.append('linearGradient')
                            .attr("x1", "0%").attr("y1", "0%")
                            .attr("x2", "0%").attr("y2", "100%")
                            .attr('id', 'chartGradient');

                    // - Define gradient colors
                    mainGradient.append('stop')
                        .attr('style', "stop-color: rgb(255,255,255); stop-opacity: 1")
                        .attr('offset', '0')
                        .append('stop')
                        .attr('style', "stop-color: rgb(255,255,255); stop-opacity: 0")
                        .attr('offset', '1');

                    var clipping = svgDefs.append("clipPath")
                        .attr("id", "timearea")
                        .append("rect")
                            .attr("x", 0)
                            .attr("width", width)
                            .attr("height", 40)
                            .attr("fill", "#151515");

        // - Timeline background
        this.svg.append("rect")
                    .attr("x", 0)
                    .attr("width", width)
                    .attr("height", 40)
                    .attr("fill", "#151515");


        // - Timeline controls group
        this.timeline = this.svg.append("g")
                    .attr("fill", "transparent");

        // - Chart group
        this.chart = this.timeline.append("g")
                    .attr("fill", "transparent")
                    .attr("height", 40)
                    .attr("overflow", "hidden")

        // - Time control group
        this.currentTimeline = this.timeline.append("g")

        // - Mouse hover time bar
        this.mouseTimeline = this.timeline.append("line")
                    .attr("x1", 0).attr("y1", 0)
                    .attr("x2", 0).attr("y2", 40)
                    .attr("stroke-width", "2")
                    .attr("opacity", 0)
                    .attr("stroke", "orange")
                    .attr("transform", "translate(1 0)");

        // - Time bar
        this.currentTimeline.append("line")
                    .attr("x1", 0).attr("y1", 0)
                    .attr("x2", 0).attr("y2", 40)
                    .attr("stroke-width", "2")
                    .attr("stroke", "orange")
                    .attr("transform", "translate(1 0)")


        this.currentTimeline.append("path")
                .attr("fill", "orange")
                .attr("transform", "translate(1 36)")
                .attr("d", triangle);

        this.currentTimeline.append("path")
                .attr("fill", "orange")
                .attr("transform", "translate(1 2.5) rotate(180)")
                .attr("d", triangle);

    	this.svg.on("mousemove", () =>
            {
                if (this.el == null)
                    return;

                var width = that.container.clientWidth;
                //var bounding = that.el.getBoundingClientRect();
                var cursorX = D3.mouse(D3.event.currentTarget)[0];// Math.max(Math.min(e.clientX, bounding.right) - bounding.left, 0);

                if (that.state.hovering)
                    that.setState({ hoverTime: (cursorX / width) * that.props.duration });

                if (that.state.dragging)
                {
                    let newTime = (cursorX / width) * that.props.duration;

                    if (newTime >= 0 && newTime <= that.props.duration)
                    {
                        that.setState({ time: newTime });

                        if (that.props.onTimeChange)
                            that.props.onTimeChange(newTime);
                    }
                }
            })
    		.on("mouseover", () => { this.setState({ hovering: true }) })
          	.on("mouseout", () => { this.setState({ hovering: false }) })
          	.on("mousedown", function() { let newTime =  D3.mouse(this)[0] / width * that.props.duration; that.setState({ dragging: true, time: newTime }); if (that.props.onTimeChange) that.props.onTimeChange(newTime); });

        this.chart
        .on("mouseover", () => { this.setState({ hovering: true }); })
        .on("mouseout", () => { this.setState({ hovering: false }); })
        .on("mousedown", function() { let newTime =  D3.mouse(this)[0] / width * that.props.duration; that.setState({ dragging: true, time: newTime }); if (that.props.onTimeChange) that.props.onTimeChange(newTime); });

        window.addEventListener('mouseup', this.mouseUp, false);
        window.addEventListener('mousemove', this.mouseMove, true);

        this.setState({ zoomStart: 0, zoomEnd: this.props.duration / 2 });

	}

    mouseUp(e)
    {
        this.setState(
        {
            dragging: false
        });
    }

    mouseMove(e)
    {
        if (this.el == null)
            return;

        var width = this.container.clientWidth;
        var bounding = this.el.getBoundingClientRect();
        var cursorX = Math.max(Math.min(e.clientX, bounding.right) - bounding.left, 0);

        if (this.state.hovering)
            this.setState({ hoverTime: (cursorX / width) * this.props.duration });
    }

	componentDidUpdate(prevProps, prevState)
	{
        if (this.props.time != prevProps.time)
        {
            this.setState({ time: this.props.time });
        }
	}

	componentWillUpdate(nextProps, nextState)
	{
        var t = D3.transition().duration(40);

        if (arraysEqual(this.props.data, nextProps.data))
        {
            this.drawChart(nextProps.data);
        }

        if (this.props.duration > 0)
        {
            var pos = (nextState.time / this.props.duration) * (this.container.clientWidth);
            var zoomPos = (nextState.zoomStart / this.props.duration) * (this.container.clientWidth);
            var size = ((nextState.zoomEnd - nextState.zoomStart) / this.props.duration) * (this.container.clientWidth);

            this.currentTimeline.transition(t)
                .attr("transform", "translate(" + pos + " 0)")

            if (nextState.hovering && !nextState.zoomDragging && !nextState.hoveringZoom)
            {
                var pos = (nextState.hoverTime / this.props.duration) * (this.container.clientWidth);

                this.mouseTimeline.transition(t)
                    .attr("x1", pos).attr("y1", 0)
                    .attr("x2", pos).attr("y2", 40)
                    .attr("opacity", 0.6);
            }
            else
            {
                this.mouseTimeline.transition(t)
                    .attr("opacity", 0);
            }
        }
	}

    drawMouseTimeline(time)
    {
        var t = D3.transition().duration(750);

        this.chart.append("line")
                    .attr("class", "line")
                    .attr("stroke", "white")
                    .attr("opacity", 0.4)
                    .attr("d", valueline);
    }

    drawChart(data)
	{
        var that = this;

        function mmove()
        {
            if (that.el == null)
                return;

            var width = that.container.clientWidth;
            var bounding = that.el.getBoundingClientRect();
            var cursorX = Math.max(Math.min(D3.mouse(D3.event.currentTarget)[0], bounding.right) - bounding.left, 0);

            if (that.state.hovering)
                that.setState({ hoverTime: (cursorX / width) * that.props.duration });

            if (that.state.dragging)
            {
                let newTime = (cursorX / width) * that.props.duration;

                if (newTime >= 0 && newTime <= that.props.duration)
                {
                    that.setState({ time: newTime });

                    if (that.props.onTimeChange)
                        that.props.onTimeChange(newTime);
                }
            }
        }

		var t = D3.transition().duration(750);

        if (!data)
            return;

        // - Compress data downsampling
        if (data.length > 200)
        {
            var dataValues = this.compressArrayData(data.map(x => x.global), 200);
            var dataTimes = this.compressArrayData(data.map(x => x.time), 200);
            data = dataValues.map((x, i) => ({ time: dataTimes[i], global: x }));
        }

        // - Limit data spikes
        var max = D3.mean(data, d => d.global) * 2;
        data = data.map(v => ({ time: v.time, global: Math.min(v.global, max) }))

        // - Set the ranges
        var xAxe = D3.scaleLinear().range([0, this.container.clientWidth]);
        var yAxe = D3.scaleLinear().range([40, 0]);

        // - Scale the range of the data
        xAxe.domain([0, D3.max(data, d => d.time)]);
        yAxe.domain([0, max]);

        // define the area
        var area = D3.area()
            .x(d => xAxe(d.time).toFixed(4))
            .y0(this.container.clientHeight)
            .y1(d => yAxe(d.global).toFixed(4))
            .curve(D3.curveBasis);

        // - Define the line
        var valueline = D3.line()
            .x(d => xAxe(d.time).toFixed(4))
            .y(d => yAxe(d.global).toFixed(4))
            .curve(D3.curveBasis);

        this.chart.selectAll("path").remove();

        this.chart.append("path")
                    .data([data])
                    .attr("class", "line")
                    .attr("stroke", "white")
                    .attr("opacity", 0.4)
                    .attr("d", valueline)
                    .on("mousemove", mmove);
        this.chart.append("path")
                    .data([data])
                    .attr("class", "area")
                    .attr("opacity", 0.2)
                    .attr("height", 40)
                    .attr("fill", "url(#chartGradient)")
                    .attr("clip-path", "url(#timearea)")
                    .attr("d", area)
                    .on("mousemove", mmove);
	}



    compressArrayData(arr, toLen)
    {
        if (!Array.isArray(arr) || isNaN(toLen) || arr.length < toLen) throw "ArgumentError";

        var sizeRatio = arr.length / toLen;

        var results = [];
        var resIndx = 0;
        var rest = 0;
        var lastRatio = sizeRatio;
        var lastVal = 0;

        for (var i = 0; i < arr.length; i++)
        {
            var r = rest;
            rest = 0;

            var v = arr[i];
            if (lastRatio < 1) {
                var c = v * lastRatio;
                rest = v - c;
                v = c;
            }

            lastRatio -= 1;
            lastVal += v + r;

            if (lastRatio <= 0)
            {
                results[resIndx++] = lastVal;
                lastVal = 0;
                lastRatio += sizeRatio;
            }
        }
        return results;
    }


    defaultStream = (streams, type) => streams.find(stream => stream.codec.type == type);
}

function arraysEqual(a, b)
{
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i)
    {
        if (a[i].value !== b[i].value || a[i].color !== b[i].color) return false;
    }

    return true;
}
