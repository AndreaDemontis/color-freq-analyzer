import React, { Component } from 'react';
import * as D3 from 'd3'

export default class Spectrogram extends Component
{
	constructor(props)
	{
		super(props);

		this.margin = {top: props.noFrame ? 0 : 10, right: 0, bottom: props.noFrame ? 0 : 20, left: props.noFrame ? 0 : 20}
		this.state =
		{
			drawed: 0,
			tran: "translate(0,0) scale(" + ((props.canvasWidth - this.margin.left - this.margin.right) / props.nFrames) + ",1)"
		}


        this.canvasContext = null;

        this.style =
        {
            position: "absolute",
            left: "0px",
            top: "0px"
        }

        this.drawFrame = this.drawFrame.bind(this);
        this.clear = this.clear.bind(this);
	}


	render = () =>
	(
        <div style={{ position: "relative", overflow: "visible", width: this.props.canvasWidth + "px", height: this.props.canvasHeight + "px" }}>
			<div style={{ overflow: "hidden", width: this.props.canvasWidth - this.margin.left - this.margin.right + "px", height: this.props.canvasHeight - this.margin.top - this.margin.bottom + "px", position: "relative", background: 'black' }}>
				<img src={this.props.img} style={{transform: this.state.tran, ...this.props.style, ...this.style, transformOrigin: "left top"}} height={this.props.canvasHeight - this.margin.top - this.margin.bottom} width={this.props.nFrames} />
			</div>
			<svg style={{...this.props.style, ...this.style}} ref={e => this.svg = e}></svg>
			<div style={{ fontWeight: 'bolder', color: '#444', position: 'absolute', top: '0', bottom: '0', right: '0', left: '0', margin: 'auto', height: '40px', textAlign: 'center'}}>
				{this.props.img ? '' : 'WAITING FOR ANALYSYS'}
			</div>
        </div>
	)

	static defaultProps =
	{
        nFrames: 0,
        duration: 0,
		start: 0,
		end: -1
	}

	componentDidMount()
	{
        // - Get instances
        this.svg = D3.select(this.svg);

        // - Initlize colors
        this.colors = D3.scaleSequential(D3.interpolateInferno).domain([0.0, 1.0]);

        // - Clear canvas
        this.clear();

        var width = this.props.canvasWidth - this.margin.left - this.margin.right;
        var height = this.props.canvasHeight - this.margin.top - this.margin.bottom;

        this.svg.attr("width", width + this.margin.left + this.margin.right)
        		.attr("height", height + this.margin.top + this.margin.bottom)
                .attr("overflow", "visible")
        		.append("g")
        		.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        let endDate = new Date(0,0,0,0);
        endDate.setSeconds(this.props.duration);

		if (this.props.noFrame)
			return;

        // set the ranges
        var x = D3.scaleTime().range([0, width]).domain([new Date(0,0,0,0), endDate]);
        var y = D3.scaleLinear().range([height, 0]).domain([0, 255]);

        this.svg.append("g")
        	.attr("transform", "translate(0," + height + ")")
        	.call(D3.axisBottom(x).tickFormat(D3.timeFormat("%H:%M:%S")));


        // Add the y Axis
        this.svg.append("g")
        	.call(D3.axisLeft(y).ticks(6));
    }

	componentWillReceiveProps(nextProps)
	{
		if (this.props.start != nextProps.start || this.props.end != nextProps.end)
		{
			this.updateScaling(nextProps);
		}

		if (this.props.img !== nextProps.img)
		{
			this.updateScaling(nextProps);
		}
	}

	updateScaling(nextProps)
	{
		var width = this.props.canvasWidth - this.margin.left - this.margin.right;

		let zoomWindow = nextProps.duration / (nextProps.end - nextProps.start);
		let startTime = nextProps.start / nextProps.duration;

		if (nextProps.end < 0)
			zoomWindow = 1;

		zoomWindow = zoomWindow.toFixed(3);
		startTime = startTime.toFixed(3);

		this.setState({ tran: "scale(" + zoomWindow * (width / nextProps.nFrames).toFixed(3) + ", 1) translate(" + -(startTime * nextProps.nFrames).toFixed(0) + "px, 0px)" });
	}

    clear()
    {
    }

    drawFrame(hist)
    {
    }
}
