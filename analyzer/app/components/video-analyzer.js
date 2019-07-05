import React, { Component } from 'react';
import * as D3 from 'd3'

// - Styles
import './forms/progress-button.global.css';
import './forms/input-number.global.css';
import Style from './video-analyzer.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import
{
	faBurn, faWrench
} from '@fortawesome/free-solid-svg-icons'

// - Components
import ProgressButton  from 'react-progress-button';
import InputNumber from 'rc-input-number';
import VideoCanvas from './video-canvas';
import Spectrogram from './video-spectrogram';
import StartButton from './forms/start-button.js'

// - Get openCV
const cv = require('opencv4nodejs');

export default class VideoAnalyzer extends Component
{
    constructor(props)
    {
        super(props);

        this.state =
        {
            open: false,

            customWindow: 120,
            windowType: 'keyframe',
            dilate: true,
            erode: false,
            kernelType: 'circular',
            kernelSize: 10,
            canvasWidth: 100,
            canvasHeight: 100,
            keepRatio: true,

            eta: 0,
            startTime: Date.now(),
            preview: null,
            percentage: 0,
            processing: false,
            state: 'idle',
            frames: []
        };

        this.oldFrame = null;
        this.frameWindow = [];

        this.handleCanvasHeightChange = this.handleCanvasHeightChange.bind(this);
        this.handleCanvasWidthChange = this.handleCanvasWidthChange.bind(this);
        this.handleKernelSizeChange = this.handleKernelSizeChange.bind(this);
        this.handleCustomWindow = this.handleCustomWindow.bind(this);
        this.handleDilateCheck = this.handleDilateCheck.bind(this);
        this.handleWindowType = this.handleWindowType.bind(this);
        this.handleKernelType = this.handleKernelType.bind(this);
        this.handleErodeCheck = this.handleErodeCheck.bind(this);
        this.handleKeepRatio = this.handleKeepRatio.bind(this);
        this.processFrame = this.processFrame.bind(this);
        this.processEnd = this.processEnd.bind(this);
        this.process = this.process.bind(this);
        this.open = this.open.bind(this);

        // - Initlize colors
        this.colors = D3.scaleSequential(D3.interpolateInferno).domain([0.0, 1.0]);
    }

    render = () =>
        this.renderLayout(this.props.video, this.defaultStream(this.props.video.streams, "VIDEO"));

    renderLayout = (video, stream) =>
    (
        <div className={Style.container}>
            <div className={Style.settings}>
                <div className={Style.row}>
                    <div className={Style.process}>
                        <div>
                            <h1>Analyzer</h1>
							<p>The analysis process could takes some minutes, please wait for it to end before making changes to the selected options.<br />
	                        </p><br/>
                            <StartButton onClick={this.process} state={this.state.state} proggress={Math.min(100, this.state.percentage)}>
                                <FontAwesomeIcon icon={faBurn} onClick={this.stepBack} style={{fontSize: "16px"}}/> <span style={{marginLeft: "7px"}}>Start process</span>
                            </StartButton>
							<p>
								<b>{Math.min(100, this.state.percentage)}%</b> - Estimated time: <b>{(this.state.eta / 1000).toFixed(2)}s</b>
							</p>
                            <button onClick={this.open} className={Style.button}><FontAwesomeIcon icon={faWrench} onClick={this.stepBack} /> <span>Options</span></button>
                        </div>
                    </div>
                    <div className={Style.preview}>
                        <VideoCanvas
                            buffer={this.state.preview ? Buffer.from(this.state.preview) : null}
                            canvasWidth={260}
                            canvasHeight={200}
                            videoWidth={300}
                            videoHeight={300}
                            type="BW" />
                        <div className={Style.previewText}>{this.state.frames.length > 0 || this.state.state === 'proggress' ? "" : "WAITING FOR ANALYSYS"}</div>
                    </div>
                </div>

            </div>
            <div className={Style.moreOptions} style={{ height: this.state.open ? '160px' : '0px'}}>
            <div className={Style.row} style={{ marginTop: '20px'}}>
                <div className={Style.controls}>
                    <div>
                        <h2>Analysis scaling</h2>
                        <p>
                            Resize frames before processing, low resolution values are recommended.
                        </p>
                        <div className={Style.horizontal} style={{ marginTop: "15px", width: "190px", alignItems: "center" }}>
                                <InputNumber
                                    style={{ width: "65px", marginLeft: "auto", marginRight: "auto" }}
                                    disabled={this.state.processing}
                                    onChange={this.handleCanvasWidthChange}
                                    value={this.state.canvasWidth}
                                    min={0}
                                    placeholder={100}
                                />
                                <span><b>X</b></span>
                                <InputNumber
                                    style={{ width: "65px", marginLeft: "auto", marginRight: "auto" }}
                                    disabled={this.state.processing}
                                    onChange={this.handleCanvasHeightChange}
                                    value={this.state.canvasHeight}
                                    min={0}
                                    placeholder={100}
                                />
                        </div>
                        <div className={Style.input} style={{ marginTop: "10px", marginLeft: "5px" }}>
                            <input type="checkbox" id="ratio" name="ratio"
                                checked={this.state.keepRatio}
                                disabled={this.state.processing}
                                onChange={this.handleKeepRatio} />
                            <label htmlFor="ratio">Mantain aspect ratio</label>
                        </div>
                    </div>
                    <div>
                        <h2>Analysis type</h2>
                        <p style={{ marginBottom: "5px" }}>

                            Selection of the type of analysis to be carried out, high custom window values might
                            significantly increase processing times.

                        </p>
                        <div className={Style.horizontal} style={{ marginTop: "5px" }}>
                            <div className={Style.vertical} style={{ width: "150px"}}>
                                <div className={Style.input} style={{ marginTop: "5px" }}>
                                    <input type="radio" id="keyframe" name="windowType" value="keyframe"
                                        checked={this.state.windowType === 'keyframe'}
                                        disabled={this.state.processing}
                                        onChange={this.handleWindowType} />
                                    <label htmlFor="keyframe">Keyframe analysis</label>
                                </div>
                                <div className={Style.input}>
                                    <input type="radio" id="singleframe" name="windowType" value="singleframe"
                                        checked={this.state.windowType === 'singleframe'}
                                        disabled={this.state.processing}
                                        onChange={this.handleWindowType} />
                                    <label htmlFor="singleframe">Single frame</label>
                                </div>
                                <div className={Style.input}>
                                    <input type="radio" id="customwindow" name="windowType" value="customwindow"
                                        checked={this.state.windowType === 'customwindow'}
                                        disabled={this.state.processing}
                                        onChange={this.handleWindowType} />
                                    <label htmlFor="customwindow">Custom window</label>
                                </div>
                            </div>
                            <div className={Style.vertical} style={{ paddingTop: "2px", width: "100px"}}>
                                <p style={{ textAlign: "center", marginBottom: "3px"}}>CUSTOM WINDOW</p>
                                <InputNumber
                                    style={{ width: "55px", marginLeft: "auto", marginRight: "auto" }}
                                    disabled={this.state.windowType != 'customwindow' || this.state.processing}
                                    onChange={this.handleCustomWindow}
                                    value={this.state.customWindow}
                                    min={0} max={999}
                                    placeholder={120}
                                />
                                <p style={{ textAlign: "center", marginTop: "7px", color: "#AAA"}}>
                                    {(this.state.customWindow / (stream.codec.framerate.num / stream.codec.framerate.den)).toFixed(2)}s
                                </p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2>Connected region settings</h2>
                        <p>
                            Settings related to the erosion and expansion filters, this will carry out an approximation on the analysis.
                        </p>
                        <div className={Style.horizontal} style={{ marginTop: "5px" }}>
                            <div className={Style.vertical} style={{ width: "110px"}}>
                                <div className={Style.input}>
                                    <input type="checkbox" id="dilate" name="dilate"
                                        checked={this.state.dilate}
                                        disabled={this.state.processing}
                                        onChange={this.handleDilateCheck} />
                                    <label htmlFor="dilate">Expansion filter</label>
                                </div>
                                <div className={Style.input}>
                                    <input type="checkbox" id="erode" name="erode"
                                        checked={this.state.erode}
                                        disabled={this.state.processing}
                                        onChange={this.handleErodeCheck} />
                                    <label htmlFor="erode">Erosion filter</label>
                                </div>
                            </div>
                            <div className={Style.vertical} style={{ paddingTop: "2px", width: "190px"}}>
                                <p style={{ textAlign: "center", marginBottom: "3px"}}>KERNEL SIZE</p>
                                <InputNumber
                                    style={{ width: "55px", marginLeft: "auto", marginRight: "auto" }}
                                    disabled={this.state.processing}
                                    onChange={this.handleKernelSizeChange}
                                    value={this.state.kernelSize}
                                    min={0} max={999}
                                    placeholder={10}
                                />
                            </div>
                        </div>
                        <div className={Style.horizontal} style={{ marginTop: "5px" }}>
                            <div className={Style.input}>
                                <input type="radio" id="circular" name="kernel" value="circular"
                                    checked={this.state.kernelType === 'circular'}
                                    disabled={this.state.processing}
                                    onChange={this.handleKernelType} />
                                <label htmlFor="circular">Circular kernel</label>
                            </div>
                            <div className={Style.input} style={{ marginLeft: "5px" }}>
                                <input type="radio" id="rectangular" name="kernel" value="rectangular"
                                    checked={this.state.kernelType === 'rectangular'}
                                    disabled={this.state.processing}
                                    onChange={this.handleKernelType} />
                                <label htmlFor="rectangular">Rectangular kernel</label>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
            <div className={Style.row}>
                <div className={Style.controls}>

                </div>
            </div>
            </div>
            <div className={Style.shadow} style={{ opacity: this.state.open ? 1 : 0 }}></div>
            <div className={Style.bottom}>

                <br/><h2><center>Spectrogram</center></h2><br/>
                <Spectrogram canvasWidth="820" canvasHeight="180"
                    frames={this.state.frames}
                    ref={e => this.hist = e}
                    duration={video.duration}
                    img={this.state.histPrev}
                    nFrames={this.state.frames ? this.state.frames.length : 0} />
                <div className={Style.legend}>
                    0.0 <div></div> 1.0
                </div><br/>
                <div className={Style.description}>
											The above spectrogram shows how the color change index evolves over time. If there is a high concentration of pixels that changed color
											by a considerable amount the color change index will have a higher value, so the <b>upper</b> part of the spectrogram will be colored yellow, if
											the amount of color changes is low in a certain frame, the <b>lower</b> area of ​​the spectrogram will be yellow instead.
                </div>
            </div>
        </div>
    )

    open()
    {
        this.setState({ open: !this.state.open });
    }

    handleKeepRatio(ev)
    {
        this.setState({ keepRatio: ev.target.checked });
    }

    handleCanvasHeightChange(value)
    {
        let codec = this.defaultStream(this.props.video.streams, "VIDEO").codec;
        let ratio = codec.video.frameSize.width / codec.video.frameSize.height;

        this.setState({ canvasHeight: value });

        if (this.state.keepRatio)
        {
            this.setState({ canvasWidth: (value * ratio).toFixed(0) });
        }
    }

    handleCanvasWidthChange(value)
    {
        let codec = this.defaultStream(this.props.video.streams, "VIDEO").codec;
        let ratio = codec.video.frameSize.height / codec.video.frameSize.width;

        this.setState({ canvasWidth: value });

        if (this.state.keepRatio)
        {
            this.setState({ canvasHeight: (value * ratio).toFixed(0) });
        }
    }

    handleKernelSizeChange(value)
    {
        this.setState({ kernelSize: value });
    }

    handleCustomWindow(value)
    {
        this.setState({ customWindow: value });
    }

    handleWindowType(ev)
    {
        this.setState({ windowType: ev.target.value });
    }

    handleKernelType(ev)
    {
        this.setState({ kernelType: ev.target.value });
    }

    handleDilateCheck(ev)
    {
        this.setState({ dilate: ev.target.checked });
    }

    handleErodeCheck(ev)
    {
        this.setState({ erode: ev.target.checked });
    }

    process()
    {
        let video = this.props.video;

        let reader = video.getReader();
        this.setState({ reader: reader });

        reader.togglePause(false);
        reader.on('frame', this.processFrame);
        reader.on('end', this.processEnd);

        console.group("[DCR] Video scan process.")
        console.time("[DCR] Video analysis");

        this.setState(
        {
            processing: true,
            percentage: 0,
            startTime: Date.now(),
            eta: 0,
            state: 'proggress'
        });

        this.hist.clear();

        this.oldFrame = null;
        this.frameWindow = [];
        this.frames = [];

        reader.initialize(true, "BGR24", 300, 300);
    }

    processFrame(frame)
    {
        let preview = null;

        // - Take the frame as buffer
        const buff = Buffer.from(frame.buffer);

        // - Get the current frame data as rgb matrix
        const currFrame = new cv.Mat(buff, frame.height, frame.width, cv.CV_8UC3)
                                .convertTo(cv.CV_32FC3);

        // - Save the current frame as last frame
        // - for the next processing step
        if (this.state.windowType === "keyframe" && frame.keyFrame)
            this.oldFrame = currFrame.copy();

        // - If there's no old frame, skip processing step
        if (this.oldFrame != null)
        {
            // - Result for this frame computation
            const thresholds = [];

            // - Calculate the color difference with euclidean distance
            // - We want the following formula
            //
            //      p3 = sqrt((p1.r - p2.r)^2 + (p1.g - p2.g)^2 + (p1.b - p2.b)^2))
            //
            //  Where p3 is the new calculated matrix value for each i,j
            // -------------------------------------------------------------
            // -------------------------------------------------------------
            // -------------------------------------------------------------

            // - Difference between current and last frame
            const difference = this.oldFrame.sub(currFrame);
            // - Squares every pixel
            const diffPow = difference.hMul(difference);
            // - Sum each component of the frame (r + g + b)
            const componentSum = diffPow.transform(new cv.Mat([[1.0, 1.0, 1.0]], cv.CV_32FC1));
            // - Normalize all values in a range [0 - 255]
            const euclidean = componentSum.sqrt();
            // - Normalize all values in a range [0 - 255]
            let normalized = euclidean.div(442).mul(255);

            // - We make an aproximation trying to connect near disconnected
            // - areas by making a dilate and a erode with a choosen kernel
            const kSize = new cv.Size(this.state.kernelSize, this.state.kernelSize)
            const kType = this.state.kernelType == 'circular' ? cv.MORPH_ELLIPSE : cv.MORPH_RECT;
            const kernel = cv.getStructuringElement(kType, kSize);

            if (this.state.dilate)
                normalized = normalized.dilate(kernel);

            if (this.state.erode)
                normalized = normalized.erode(kernel);

            let euclideanAvg = new cv.Mat(frame.height, frame.width, cv.CV_32FC1);

            // - Calculate average value in a window of frames
            if (this.state.windowType === "customwindow" && this.state.customWindow > 0)
            {
                // - Save a window history
                if (this.frameWindow.length > this.state.customWindow)
                    this.frameWindow.shift();
                this.frameWindow.push(euclidean.copy());

                // - Calculate the weight for each sum in the average
                const weight = 1.0 / this.frameWindow.length;

                // - Make an averege between all matrix in the history
                for (var i = 0; i < this.frameWindow.length; ++i)
                    euclideanAvg = euclideanAvg.addWeighted(1.0, this.frameWindow[i], weight, 0);

                euclideanAvg = euclideanAvg.div(euclideanAvg.minMaxLoc().maxVal).mul(255).convertTo(cv.CV_8UC1);
            }
            // - If no window size specified use the normalized euclidean distance
            else euclideanAvg = normalized.convertTo(cv.CV_8UC1);

            // - Calculate histogram for the euclidean distance
            const hist = cv.calcHist(euclideanAvg, [{ channel: 0, ranges: [0, 255], bins: 255 }]);

            // - Save informations for this frame
            this.frames.push(
            {
                index: frame.index,
                time: frame.time,
                global: euclideanAvg.sum(),
                difference: euclideanAvg,
                hist: hist.getDataAsArray().map(x => x[0] / hist.minMaxLoc().maxVal)
            });

            preview = euclideanAvg.getData();
        }

        // - Save the current frame as last frame
        // - for the next processing step
        if (this.state.windowType != "keyframe")
            this.oldFrame = currFrame.copy();

        // - Calculate the progress
        const currentPerc = Math.ceil(frame.time / this.props.video.duration * 100);
        if (this.state.percentage < currentPerc)
        {
            console.log("% completed.");
            let elapsed = Date.now() - this.state.startTime;
            let remaining = Math.max(0,(elapsed * (100 / currentPerc)) - elapsed);
            this.setState(
            {
                percentage: currentPerc,
                eta: remaining,
                preview: preview
            });
        }
    }

    processEnd()
    {
        // - Process end
        console.log("[DCR] All data processed.")
        console.timeEnd("[DCR] Video analysis");
        console.log("[DCR] Result: ", this.frames);
        console.groupEnd();

        this.state.reader.close();
        const hists = this.frames.map((x) => x.hist.reverse());

        var that = this;
        const matData = Object.keys(hists[0]).map((x) => hists.map((v) => { let c = D3.rgb(that.colors(v[x])); return [c.b, c.g, c.r];}));
        console.log(matData);
        const matFromArray = new cv.Mat(matData, cv.CV_8UC3);
        const outBase64 =  cv.imencode('.jpg', matFromArray).toString('base64');
        const htmlImg='data:image/jpeg;base64,'+ outBase64;
        this.setState({ processing: false, state: 'idle', percentage: 0, frames: this.frames, histPrev: htmlImg });

        if (this.props.onFinish)
            this.props.onFinish(this.frames, htmlImg);
    }

    defaultStream = (streams, type) => streams.find(stream => stream.codec.type == type);
}
