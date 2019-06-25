// @flow
import React, { Component } from 'react';
import * as D3 from 'd3'
import moment from 'moment'

// - Components
import SpectrumRanges from './spectrum-ranges';
import TimeBar from './time-bar';

// - Style
import style from "./video-timeline.css";

export default class VideoTimeline extends Component
{

    constructor(props)
    {
        super(props)

        this.state =
        {
            // - State
            time: 0,
            zoomStart: 0,
            zoomEnd: 10,

            // - Mouse controls
            hoverTime: 0,
			dragging: false,
			hovering: false,
            hoveringZoom: false,
            zoomDragging: false,
            zoomResizingRight: false,
            zoomDraggingStart: 0
        }

        this.drawChart = this.drawChart.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
    }

    render = () =>
        this.renderLayout(this.props.video, this.defaultStream(this.props.video.streams, "VIDEO"))

    renderLayout = (video, stream) =>
    (
        <div className={style.container}>
            <TimeBar
                data={this.props.data}
                time={this.props.time}
                frame={this.props.frame}
                duration={this.props.duration}
                video={this.props.video}
                onTimeChange={this.props.onTimeChange} />
            <div className={style.hist}>
                <div className={style.timeRight}></div>
                <div>

                    <SpectrumRanges canvasWidth="688" canvasHeight="256"
                        data={this.props.data}
                        duration={video.duration}
                        start={this.state.zoomStart}
                        end={this.state.zoomEnd}
                        img={this.props.img}
                        time={this.state.time}
                        onChange={this.props.onRangesChange}
                        noFrame />
                </div>
                <div className={style.timeLeft}></div>
            </div>
            <div className={style.timeline}>
                <div ref={e => this.container = e} style={{ width: "688px", height: "20px"}}>
                    <svg ref={e => this.el = e} />
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



        // - Timeline background
        //this.svg.append("rect")
        //            .attr("x", 0)
        //            .attr("width", width)
        //            .attr("height", 40)
        //            .attr("fill", "#151515");

        // - Resize bar background
        this.svg.append("rect")
                    .attr("x", 0).attr("y", 0)
                    .attr("width", width)
                    .attr("height",20)
                    .attr("fill", "#090909");

        // - Timeline controls group
        this.timeline = this.svg.append("g")
                    .attr("fill", "transparent");

        // - Chart group
        this.chart = this.svg.append("g")
                    .attr("fill", "transparent")
                    .attr("height", 40)
                    .attr("overflow", "hidden")

        // - Zoom control group
        this.zoomArea = this.timeline.append("g")

        // - Time control group
        //this.currentTimeline = this.timeline.append("g")

        // - Time bar
        //this.currentTimeline.append("line")
        //            .attr("x1", 0).attr("y1", 0)
        //            .attr("x2", 0).attr("y2", 40)
        //            .attr("stroke-width", "2")
        //            .attr("stroke", "orange")
        //            .attr("transform", "translate(1 0)")
        //            .attr("opacity", 0.4)

        // - Zoom area visualization
        //this.zoomArea.append("rect")
        //             .attr("x", 0).attr("y", 0)
        //             .attr("rx", 5).attr("ry", 5)
        //             .attr("width", 100)
        //             .attr("height", 40)
        //             .attr("fill", "white")
        //             .attr("opacity", 0.3)

        // - Zoom area move bar
        this.zoomBar = this.zoomArea.append("rect")
                     .attr("x", 0).attr("y", 5)
                     .attr("rx", 5).attr("ry", 8)
                     .attr("width", 100)
                     .attr("height", 10)
                     .attr("class", style.zoomBar)
                     .attr("fill", "green")

        this.moveHandle = this.zoomArea.append("g")
        this.moveHandle.append("line")
                  .attr("x1", 0).attr("x2", 0)
                  .attr("y1", 7).attr("y2", 13)
                  .attr("stroke", "black")
                  .attr("opacity", 0.5)
                  .attr("shape-rendering", "crispEdges")
        this.moveHandle.append("line")
                  .attr("x1", 3).attr("x2", 3)
                  .attr("y1", 7).attr("y2", 13)
                  .attr("stroke", "black")
                  .attr("opacity", 0.5)
                  .attr("shape-rendering", "crispEdges")
        this.moveHandle.append("line")
                  .attr("x1", 6).attr("x2", 6)
                  .attr("y1", 7).attr("y2", 13)
                  .attr("stroke", "black")
                  .attr("opacity", 0.5)
                  .attr("shape-rendering", "crispEdges")

        // - Zoom area resize left handle
        this.zoomLeftHandle = this.zoomArea.append("circle")
                     .attr("cx", 6).attr("cy", 10)
                     .attr("r", 4)
                     .attr("class", style.zoomLeftHandle)
                     .attr("fill", "black")
                     .attr("opacity", 0.5)

        // - Zoom area resize right handle
        this.zoomRightHandle = this.zoomArea.append("circle")
                    .attr("cx", 94).attr("cy", 10)
                    .attr("r", 4)
                    .attr("class", style.zoomRightHandle)
                    .attr("fill", "black")
                    .attr("opacity", 0.5)

    	this.svg
    		.on("mouseover", () => { this.setState({ hovering: true }); })
          	.on("mouseout", () => { this.setState({ hovering: false }); })
          	.on("mousedown", function() { that.setState({ dragging: true }); });

        this.zoomBar.on("mousedown", this.mouseDown("zoomBar"));
        this.zoomRightHandle.on("mousedown", this.mouseDown("zoomRightHandle"));
        this.zoomLeftHandle.on("mousedown", this.mouseDown("zoomLeftHandle"));

        window.addEventListener('mouseup', this.mouseUp, false);
        window.addEventListener('mousemove', this.mouseMove);

        this.setState({ zoomStart: 0, zoomEnd: this.props.duration / 2 });

        this.drawChart();
	}

    mouseDown(type)
    {
        var that = this;

        return function ()
        {
            switch(type)
            {
                case "zoomBar":
                    that.setState({ zoomDragging: true });
                    break;
                case "zoomRightHandle":
                    that.setState({ zoomResizingRight: true });
                    break;
                case "zoomLeftHandle":
                    that.setState({ zoomResizingLeft: true });
                    break;
            }

            that.setState({ zoomDraggingStart: D3.mouse(this)[0] });
            D3.event.stopPropagation();
        }
    }

    mouseUp(e)
    {
        this.setState(
        {
            dragging: false,
            zoomDragging: false,
            zoomResizingRight: false,
            zoomResizingLeft: false,
            zoomDraggingStart: 0
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

        if (this.state.zoomResizingRight)
        {
            let zoomEnd = ((cursorX + 6) / width) * this.props.duration;
            zoomEnd = Math.min(zoomEnd, this.props.duration);

            if (zoomEnd >= this.state.zoomStart + 50 / this.container.clientWidth * this.props.duration)
            {
                this.setState({ zoomEnd: zoomEnd });

                if (this.props.onZoomChange)
                    this.props.onZoomChange(this.state.zoomStart, zoomEnd);
            }
        }

        if (this.state.zoomResizingLeft)
        {
            let zoomStart = ((cursorX - 6) / width) * this.props.duration;
            zoomStart = Math.max(zoomStart, 0);

            if (zoomStart <= this.state.zoomEnd - 50 / this.container.clientWidth * this.props.duration)
            {
                this.setState({ zoomStart: zoomStart });

                if (this.props.onZoomChange)
                    this.props.onZoomChange(zoomStart, this.state.zoomEnd);
            }
        }

        if (this.state.zoomDragging)
        {
            var zoomSize = this.state.zoomEnd - this.state.zoomStart;

            var zoomStart = (cursorX - this.state.zoomDraggingStart) / width * this.props.duration;
            zoomStart = Math.max(Math.min(zoomStart, this.props.duration - zoomSize), 0);

            var zoomEnd = zoomStart + zoomSize

            this.setState({ zoomEnd: zoomEnd, zoomStart: zoomStart });

            if (this.props.onZoomChange)
                this.props.onZoomChange(zoomStart, zoomEnd);
        }
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

        }

        if (this.props.duration > 0)
        {
            var pos = (nextState.time / this.props.duration) * (this.container.clientWidth);
            var zoomPos = (nextState.zoomStart / this.props.duration) * (this.container.clientWidth);
            var size = ((nextState.zoomEnd - nextState.zoomStart) / this.props.duration) * (this.container.clientWidth);

            //this.currentTimeline.transition(t)
            //    .attr("transform", "translate(" + pos + " 0)")

            this.zoomArea.attr("transform", "translate(" + zoomPos + " 0)")
            this.zoomArea.selectAll("rect").attr("width", size)
            this.moveHandle.attr("transform", "translate(" + ((size / 2).toFixed(0) - 3 + 0.5) + " 0)")
            this.zoomRightHandle.attr("cx", size - 6)

        }
	}


	drawChart(data)
	{
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
                    .attr("d", valueline);
        this.chart.append("path")
                    .data([data])
                    .attr("class", "area")
                    .attr("opacity", 0.2)
                    .attr("height", 40)
                    .attr("fill", "url(#chartGradient)")
                    .attr("clip-path", "url(#timearea)")
                    .attr("d", area);
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
