// @flow
import React, { Component } from 'react';

class Texture
{
	constructor(gl)
	{
		this.gl = gl;
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	bind(n, program, name)
	{
		var gl = this.gl;
		gl.activeTexture([gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2][n]);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(gl.getUniformLocation(program, name), n);
	}

	fill(width, height, type, data)
	{
		var gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, type, width, height, 0, type, gl.UNSIGNED_BYTE, data);
	}
}

export default class VideoCanvas extends Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
		}

		this.draw = this.draw.bind(this);
	}


	render = () =>
	(
		<canvas style={this.props.style} width={this.props.canvasWidth} height={this.props.canvasHeight} ref={e => this.canvas = e}></canvas>
	)

	static defaultProps =
	{
		type: "YUV420"
	}

	componentDidMount()
	{
		this.gl = this.canvas.getContext("webgl", { preserveDrawingBuffer: true });

		if (!this.gl)
		{
			console.log("Unable to open gl context.");
		}

		var gl = this.gl;

		var program = gl.createProgram();

		// ====================================================================
		// Shader section
		// ====================================================================
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, VideoCanvas.vertexShaderCode);
		gl.compileShader(vertexShader);

		let fragmentSourceCode = "";
		switch (this.props.type)
		{
			case "YUV420": fragmentSourceCode = VideoCanvas.fragmentYUVShaderCode; break;
			case "RGB": fragmentSourceCode = VideoCanvas.fragmentRGBShaderCode; break;
			case "BW": fragmentSourceCode = VideoCanvas.fragmentWBShaderCode; break;
		}

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, fragmentSourceCode);
		gl.compileShader(fragmentShader);

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		gl.useProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		{
        	console.log("Shader link failed.");
			return;
		}

		var vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    	gl.enableVertexAttribArray(vertexPositionAttribute);
    	var textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    	gl.enableVertexAttribArray(textureCoordAttribute);

		// ====================================================================
		// Buffer configuration
		// ====================================================================
		var verticesBuffer = gl.createBuffer();
    	gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    	gl.bufferData(gl.ARRAY_BUFFER, VideoCanvas.vertices, gl.STATIC_DRAW);
    	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    	var texCoordBuffer = gl.createBuffer();
    	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    	gl.bufferData(gl.ARRAY_BUFFER, VideoCanvas.texCoord, gl.STATIC_DRAW);
    	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

		switch (this.props.type)
		{
			case "YUV420":
				gl.y = new Texture(gl);
		    	gl.u = new Texture(gl);
		    	gl.v = new Texture(gl);
				gl.u.bind(1, program, "UTexture");
		    	gl.y.bind(0, program, "YTexture");
		    	gl.v.bind(2, program, "VTexture");
				break;
			case "RGB":
				gl.rgb = new Texture(gl);
				gl.rgb.bind(1, program, "RGBTexture");
				break;
			case "BW":
				gl.w = new Texture(gl);
				gl.w.bind(1, program, "WTexture");
				break;
		}
	}

	componentWillReceiveProps(nextProps)
	{
        if (this.props.buffer !== nextProps.buffer && nextProps.buffer)
        {
			// TODO: Controllare se vengono inserite width e height in next props al cambio frame
            this.draw(nextProps.buffer, nextProps.videoWidth, nextProps.videoHeight);
        }

		if (this.props.canvasWidth !== nextProps.canvasWidth
		||  this.props.canvasHeight !== nextProps.canvasHeight)
		{
			this.frameSetup(nextProps.canvasWidth, nextProps.canvasHeight);
		}
	}

	componentWillUpdate(nextProps, nextState)
	{
	}

	frameSetup(width, height)
	{
    	this.gl.viewport(0, 0, width, height);
	}

	renderFrame(frame, width, height)
	{
		var gl = this.gl;

		switch (this.props.type)
		{
			case "YUV420":
				let y = width * height;
				let uOffset = y
				let vOffset = y + y / 4
				gl.y.fill(width, height, gl.LUMINANCE, frame.subarray(0, uOffset));
				gl.u.fill(width >> 1, height >> 1, gl.LUMINANCE, frame.subarray(uOffset, vOffset));
				gl.v.fill(width >> 1, height >> 1, gl.LUMINANCE, frame.subarray(vOffset, frame.length));
				break;
			case "RGB":
				gl.rgb.fill(width, height, gl.RGB, frame);
				break;
			case "BW":
				gl.w.fill(width, height, gl.LUMINANCE, frame);
				break;
		}

    	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	fillBlack()
	{
		var gl = this.gl;

		var arr1 = new Uint8Array(1),
        arr2 = new Uint8Array(1);

    	arr1[0] = 0;
    	arr2[0] = 128;

		switch (this.props.type)
		{
			case "YUV420":
				gl.y.fill(1, 1, gl.LUMINANCE, arr1);
				gl.u.fill(1, 1, gl.LUMINANCE, arr2);
				gl.v.fill(1, 1, gl.LUMINANCE, arr2);
				break;
			case "RGB":
				gl.rgb.fill(1, 1, gl.RGB, arr1);
				break;
			case "BW":
				gl.w.fill(1, 1, gl.LUMINANCE, arr1);
				break;
		}

    	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	draw(buffer, width, height)
	{
		this.renderFrame(buffer, width, height);
	}

	static vertices = new Float32Array([1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0]);
	static texCoord = new Float32Array([1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0]);

	static vertexShaderCode =
	`
		attribute highp vec4 aVertexPosition;
		attribute vec2 aTextureCoord;
		varying highp vec2 vTextureCoord;

		void main(void)
		{
			gl_Position = aVertexPosition;
			vTextureCoord = aTextureCoord;
		}
	`

	static fragmentWBShaderCode =
	`
		precision highp float;
		varying lowp vec2 vTextureCoord;
		uniform sampler2D WTexture;

		void main(void)
		{
			gl_FragColor = vec4(texture2D(WTexture, vTextureCoord).x, texture2D(WTexture, vTextureCoord).x, texture2D(WTexture, vTextureCoord).x, 1);
		}
	`

	static fragmentRGBShaderCode =
	`
		precision highp float;
		varying lowp vec2 vTextureCoord;
		uniform sampler2D RGBTexture;

		void main(void)
		{
			float opacity = 0.7;
			vec3 color = texture2D(RGBTexture, vTextureCoord).xyz;

			if (color.x == 0.0 && color.y == 0.0 && color.z == 0.0)
			{
				opacity = 0.0;
			}

			gl_FragColor = vec4(color.x, color.y, color.z, opacity);
		}
	`

	static fragmentYUVShaderCode =
	`
		precision highp float;
		varying lowp vec2 vTextureCoord;
		uniform sampler2D YTexture;
		uniform sampler2D UTexture;
		uniform sampler2D VTexture;

		const mat4 YUV2RGB = mat4
		(
			1.1643828125, 0, 1.59602734375, -.87078515625,
			1.1643828125, -.39176171875, -.81296875, .52959375,
			1.1643828125, 2.017234375, 0, -1.081390625,
			0, 0, 0, 1
		);

		void main(void)
		{
			gl_FragColor = vec4(texture2D(YTexture, vTextureCoord).x, texture2D(UTexture, vTextureCoord).x, texture2D(VTexture, vTextureCoord).x, 1) * YUV2RGB;
		}
	`
}
