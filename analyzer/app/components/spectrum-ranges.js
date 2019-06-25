// @flow
import React, { Component } from 'react';
import * as D3 from 'd3'
import moment from 'moment'

import
{
	faPalette
} from '@fortawesome/free-solid-svg-icons'

// - Components
import Spectrogram from './video-spectrogram';

export default class SpectrumRanges extends Component
{

    constructor(props)
    {
        super(props)

        this.state =
        {
            hovering: false,

            ranges: []
        }

        this.mouseMove = this.mouseMove.bind(this);
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
    }

    render = () =>
        this.renderLayout()

    renderLayout = () =>
    (
        <div style={{ position: "relative", top: 0 }}>
            <Spectrogram canvasWidth="688" canvasHeight="256"
                ref={e => this.hist = e}
                duration={this.props.duration}
                nFrames={this.props.data ? this.props.data.length : 0}
                start={this.props.start}
                end={this.props.end}
                img={this.props.img}
                noFrame />
            <svg ref={e => this.el = e} style={{ position: "absolute", top: 0, overflow: "visible" }} />
        </div>
    )

    componentDidMount()
	{
        var that = this;

        var triangle = D3.symbol()
            .type(D3.symbolTriangle)
            .size(40)

		this.svg = D3.select(this.el)
                    .attr("width", 688)
                    .attr("height", 256)

        this.ghostLine = this.svg.append("g")
                    .attr("opacity", 0)
        this.ranges = this.svg.append("g")
        this.placeholder = this.svg.append("g")
        this.cursor = this.svg.append("g")
                    .append("line")
                    .attr("x1", 0).attr("y1", 0)
                    .attr("x2", 0).attr("y2", 256)
                    .attr("stroke-width", "2")
                    .attr("stroke", "orange")

        this.ghostLine.append("line")
                    .attr("x1", 0).attr("y1", 0)
                    .attr("x2", 688).attr("y2", 0)
                    .attr("stroke-width", "2")
                    .attr("stroke", "orange")
        this.ghostLine.append("path")
                    .attr("fill", "orange")
                    .attr("transform", "translate(700 0) rotate(-90)")
                    .attr("d", triangle);
        this.ghostLineLabel = this.ghostLine.append("text")
                    .attr("transform", "translate(715 3.5)")
                    .attr("style", "font-size: 13px; font-family: 'consolas';")
                    .attr("fill", "orange")
                    .text("0")

        this.cursor.append("line")
                    .attr("x1", 0).attr("y1", 0)
                    .attr("x2", 0).attr("y2", 256)
                    .attr("stroke-width", "2")
                    .attr("stroke", "orange")

    	this.svg
    		.on("mouseover", () => { this.setState({ hovering: true }); })
          	.on("mouseout", () => { this.setState({ hovering: false }); })
          	.on("mousedown", this.mouseDown('add'));

        this.placeholder.attr("transform", "translate(0 " + (256 / 2) + ")")
        let path = this.placeholder.append("path")
                .attr("transform", "translate(700 0) rotate(-90)")
                .attr("d", triangle)
                .attr("fill", "gray")
        let text = this.placeholder.append("text")
                .attr("transform", "translate(715 3.5)")
                .attr("class", "value")
                .attr("style", "font-size: 13px; font-family: 'consolas';")
                .attr("fill", "gray")
                .text("Add range");

        window.addEventListener('mouseup', this.mouseUp, false);
        window.addEventListener('mousemove', this.mouseMove);
	}

    mouseDown(type)
    {
        var that = this;

        function doubleClick(callback)
        {
            if (that.state.doubleClick)
                that.state.doubleClick();
            that.setState({ doubleClick: callback });
            setTimeout(() => that.setState({ doubleClick: null }), 300);
        }

        return function (d)
        {
            if (type === 'add' && that.state.hovering && !that.state.hoveringRange)
            {
                that.setState(
                {
                    ranges: that.state.ranges.concat(
                    [{
                        value: 256 - D3.mouse(this)[1],
                        color: D3.interpolateRdPu(D3.mouse(this)[1] / 256)
                    }])
                });
            }

            if (type === 'remove')
            {
                that.setState(
                {
                    ranges: that.state.ranges.filter((item) => item.value !== d.value),
                    hoveringRange: null
                });

                D3.event.stopPropagation();
            }

            if (type === 'line')
            {
                let index = that.state.ranges.findIndex((v) => v.value === d.value);
                console.log(that.state.ranges);
                console.log(d.value);

                that.setState(
                {
                    selectedRange: index + 1
                });
            }

            if (type == 'color')
            {
                let index = that.state.ranges.findIndex((v) => v.value === d.value);

                that.setState(
                {
                    selectedRange: index + 1,
                    changeColor: true
                });

                D3.event.stopPropagation();
            }

            // - D3.event.stopPropagation();
        }
    }

    mouseUp(e)
    {
        this.setState(
        {
            dragging: false,
            selectedRange: null
        });
    }

    mouseMove(e)
    {
        if (this.el == null)
            return;

        var width = 688;
        var bounding = this.el.getBoundingClientRect();
        var cursorX = Math.max(Math.min(e.clientX, bounding.right) - bounding.left, 0);
        var cursorY = Math.max(Math.min(e.clientY, bounding.bottom) - bounding.top, 0);

        if (this.state.hovering && !this.state.hoveringRange)
        {
            this.ghostLine.attr("opacity", 0.6)
                          .attr("transform", "translate(0 " + cursorY + ")");

            this.ghostLineLabel.text(255 - cursorY + " Add range");
        }
        else
        {
            this.ghostLine.attr("opacity", 0);
        }

        if (this.state.selectedRange && !this.state.changeColor)
        {
            let ranges = [...this.state.ranges];
            ranges[this.state.selectedRange - 1] = { value: 256 - cursorY, color: ranges[this.state.selectedRange - 1].color };
            this.setState({ ranges: ranges });
        }
    }

	componentDidUpdate(prevProps, prevState)
	{
        let that = this, i = 0;
        function updateHist(data)
        {
            if (i >= data.length) return;
            that.hist.drawFrame(data[i++].hist);
            setTimeout(() => updateHist(data), 1);
        }

        if (this.props.data !== prevProps.data)
        {
            this.hist.clear();
            i = 0;
            updateHist(this.props.data);
        }

        if (this.props.time !== prevProps.time || this.props.start !== prevProps.start || this.props.end !== prevProps.end)
        {
            let zoom = (this.props.duration / (this.props.end - this.props.start))
            let pos = ((this.props.time / this.props.duration) * this.props.canvasWidth)
            * zoom - ((this.props.start / this.props.duration) * this.props.canvasWidth) * zoom;
            this.cursor.attr("x1", pos).attr("y1", 0)
                       .attr("x2", pos).attr("y2", 256)

            if (pos < 0 || pos > 688)
                this.cursor.attr("opacity", 0);
            else
                this.cursor.attr("opacity", 1);
        }

        if (this.props.time != prevProps.time)
        {
            this.setState({ time: this.props.time });
        }

        if (this.state.ranges.length <= 0 && !this.state.hovering)
        {
            this.placeholder.attr("opacity", 0.6)
        }
        else
        {
            this.placeholder.attr("opacity", 0)
        }

        if (!arraysEqual(this.state.ranges, prevState.ranges))
        {
            var triangle = D3.symbol()
                .type(D3.symbolTriangle)
                .size(40)

            if (this.props.onChange)
                this.props.onChange(this.state.ranges);

            let data = this.ranges.selectAll(".elem")
                    .data(this.state.ranges.sort((a, b) => a - b))

            // - Removed unused items
            data.exit().remove()

            // - Insert new items
            let enter = data.enter()
                    .append("g")
                    .attr("class", "elem")
                    .attr("transform", (d) => "translate(0 " + (256 - d.value) + ")")
            let line = enter.append("line")
                    .attr("x1", 0).attr("y1", 0)
                    .attr("x2", 688).attr("y2", 0)
                    .attr("stroke-width", "2")
                    .attr("stroke", (d) => d.color)
            let path = enter.append("path")
                    .attr("transform", "translate(700 0) rotate(-90)")
                    .attr("d", triangle)
                    .attr("fill", (d) => d.color)
            let buttons = enter.append('g')
                    .attr("transform", "translate(0 0)")
                    .on("mouseover", (e) =>
                    {
                        this.setState({ hoveringRange: { element: e } });
                        button.style("display", "block");
                        color.style("display", "block");
                        text.attr("transform", "translate(730 3.5)")
                    })
                    .on("mouseout", (e) =>
                    {
                        this.setState({ hoveringRange: null });
                        button.style("display", "none");
                        color.style("display", "none");
                        text.attr("transform", "translate(715 3.5)")
                    })
                    .on("mousedown", this.mouseDown('line'))
            let text = buttons.append("text")
                    .attr("transform", "translate(715 3.5)")
                    .attr("class", "value")
                    .attr("style", "font-size: 13px; font-family: 'consolas';")
                    .attr("fill", (d) => d.color)
                    .text((d) => d.value)
            let controls = buttons.append("rect")
                    .attr('class', 'click-capture')
                    .style('fill', 'transparent')
                    .style('stroke', 'transparent')
                    .style('cursor', 'pointer')
                    .attr("transform", "translate(0 -5)")
                    .attr('width', 765)
                    .attr('height', 10)
            let color = buttons.append("path")
                    .attr("transform", "translate(715 -5), scale(0.02 0.02)")
                    .attr("class", "color")
                    .attr("fill", (d) => d.color)
                    .attr("display", "none")
                    .attr("d", faPalette.icon[4])
                    .on("mousedown", this.mouseDown('color'))
                    .on("mouseover", (e) => { this.setState({ hoveringRange: { element: e } });})
            let button = buttons.append("text")
                    .attr("transform", "translate(757 3.5)")
                    .attr("class", "button")
                    .attr("style", "font-size: 14px; font-family: 'consolas';")
                    .attr("fill", "#E05555")
                    .attr("display", "none")
                    .text("x")
                    .on("mousedown", this.mouseDown('remove'))
                    .on("mouseover", (e) => { this.setState({ hoveringRange: { element: e } }); })

            // - Update items from data
            data.attr("transform", (d) => "translate(0 " + (256 - d.value) + ")")
            data.select('line').attr("stroke", (d) => d.color)
            data.select('path').attr("fill", (d) => d.color)
            data.select(".value")
                .attr("fill", (d) => d.color)
                .text((d) => d.value)
            data.select(".button")
                .on("mousedown", this.mouseDown('remove'))
                .on("mouseover", (e) => this.setState({ hoveringRange: { element: e } }))
                .on("mouseout", () => this.setState({ hoveringRange: null }))
            data.select(".color")
                .on("mousedown", this.mouseDown('color'))
                .attr("fill", (d) => d.color)
                .on("mouseover", (e) => this.setState({ hoveringRange: { element: e } }))
                .on("mouseout", () => this.setState({ hoveringRange: null }))
            data.select("g").select("rect")
                .on("mouseover", (e) =>
                {
                    this.setState({ hoveringRange: { element: e } });
                })
                .on("mouseout", (e) =>
                {
                    this.setState({ hoveringRange: null });
                })
                .on("mousedown", this.mouseDown('line'))



        }
	}

	componentWillUpdate(nextProps, nextState)
	{
        if (nextState.changeColor && nextState.selectedRange >= 0)
        {
            let d = nextState.selectedRange;
            this.setState({ changeColor: false, selectedRange: null });
            var input = document.createElement('input');
            input.type = 'color';

            input.onchange = e =>
            {
                let ranges = [...this.state.ranges];

                console.log(nextState.selectedRange - 1);

                ranges[nextState.selectedRange - 1] =
                {
                    color: input.value,
                    value: ranges[nextState.selectedRange - 1].value
                };

                this.setState({ ranges: ranges });
            }

            input.click();
        }

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
