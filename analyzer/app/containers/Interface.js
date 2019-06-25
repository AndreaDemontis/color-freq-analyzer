import React, { Component } from 'react';
import * as D3 from 'd3'

var NotificationSystem = require('react-notification-system');

// - Get openCV
const cv = require('opencv4nodejs');

// - Styles
import Style from './Interface.css'

// - Components
import FileDrop from '../components/forms/file-drop'
import VideoAnalyzer from '../components/video-analyzer'
import VideoTimeline from '../components/video-timeline'
import VideoControls from '../components/video-controls'
import VideoCanvas from '../components/video-canvas'
import VideoTitle from '../components/video-title'
import VideoInfo from '../components/video-info'

export default class HomePage extends Component
{
    constructor(props)
    {
        super(props);

        this.state =
        {
            video: null,
            viewer: false,
            data: null,
            currentTime: 0,
            ranges: [],
            hist: null,
            displayMode: 'single'
        };

        this.switchViewer = this.switchViewer.bind(this);
        this.handleDiscard = this.handleDiscard.bind(this);
    }

    componentDidMount()
    {
        this._notificationSystem = this.refs.notificationSystem;
    }

    render = () =>
    (
        <div className={Style.container}>
            {!this.state.video ? this.renderLoadVideo() : this.renderVideo()}
            {this.state.video ? this.renderViewer(this.defaultStream(this.state.video.streams, 'VIDEO')) : ""}
            <NotificationSystem ref="notificationSystem" />
        </div>
    )

    renderLoadVideo = () =>
    (
        <div className={Style.introPanel}>
            <h1>Video Analyzer</h1>
            <div className={Style.description}>
                This graphical tool allows users to perform color change analysis over time
                in any video.

                The analysis will generate a dataset that will be shown over the video being played, using colored areas representing various intensities of color change,
                the user will be ably to add and remove these ranges of color change intensity and modify the associated color for the area.

                To summarize the distribution of color change intensity ​​over time and facilitate the choice of intensity ranges a spectrogram will also be generated.
                The analyzer can be used for finding a more suitable compression configuration for online streaming.
                <br /><br />
                <h2><center>Analysis steps</center></h2>
            </div>
            <img src="img/exp.png" />
            <br />
            <div className={Style.description}>
                The analysis is performed using a linear frame-by-frame scan where each frame is scaled to improve overall time performance, there are three fundamental steps:
                <ol>
                    <li><b>Euclidean distance:</b> The Euclidean distance between the color value of the current frame and the previous one is calculated and an index is generated ranging from 0 to 1.</li>
                    <li>
                        <b>Interpolation:</b> According to the selected analysis method, an analysis will be performed using several frames:
                        <ul>
                            <li><b>Keyframe:</b> Calculates the color difference using the closest keyframe as the previous value.</li>
                            <li><b>Single frame:</b> Calculates the color difference using the single previous frame.</li>
                            <li><b>Custom window:</b> Averages the color difference index using a specified window of frames.</li>
                        </ul>
                    </li>
                    <li>
                        <b>Merge:</b> If required, an expansion and erosion filter is applied with circular or rectangular kernels of adjustable dimensions,
                                        this can be useful in order to join nearby areas by approximating the analysis.</li>
                </ol>
            </div><br /><br />
            <h1>Import data</h1>
            <FileDrop onFile={this.videoSelect}>
                <div className={Style.dropTitle}>
                    Select or Drop a video file here
                </div>
            </FileDrop>
        </div>
    )

    renderVideo = () =>
    (
        <div className={Style.analysisPanel} style={{ top: !this.state.viewer ? "0%" : "-100%"}}>
            <div>
                <VideoInfo video={this.state.video} onDiscard={this.handleDiscard} />
            </div>
            <div>
                <VideoAnalyzer video={this.state.video} onFinish={this.handleResult} />
            </div>
            <div className={Style.switch} onClick={this.switchViewer}>
                Switch to viewer
            </div>
        </div>
    )

    renderViewer = (stream) =>
    (
        <div className={Style.viewerPanel} style={{ top: !this.state.viewer ? "100%" : "0%"}}>
            <VideoTitle video={this.state.video} onclick={this.switchViewer} />
            <div className={Style.viewer} style={this.state.displayMode === 'single' ? { position: 'relative' } : { display: 'flex' }}>

                <VideoCanvas
                    style={{ position: this.state.displayMode === 'single' ? "absolute" : "relative" }}
                    buffer={this.state.currFrame ? this.state.currFrame.buffer : null}
                    videoWidth={stream.codec.video ? stream.codec.video.frameSize.width : 0}
                    videoHeight={stream.codec.video ? stream.codec.video.frameSize.height : 0}
                    canvasWidth={this.state.displayMode === 'single' ? (stream.codec.video ? stream.codec.video.frameSize.width / stream.codec.video.frameSize.height * 354  : 0) : 472}
                    canvasHeight={this.state.displayMode === 'single' ? 400 : (stream.codec.video ? stream.codec.video.frameSize.height / stream.codec.video.frameSize.width * 472  : 0)} />

                <VideoCanvas
                    style={{ position: this.state.displayMode === 'single' ? "absolute" : "relative" }}
                    buffer={this.state.overlayBuffer}
                    videoWidth={300}
                    videoHeight={300}
                    canvasWidth={this.state.displayMode === 'single' ? (stream.codec.video ? stream.codec.video.frameSize.width / stream.codec.video.frameSize.height * 354  : 0) : 472}
                    canvasHeight={this.state.displayMode === 'single' ? 400 : (stream.codec.video ? stream.codec.video.frameSize.height / stream.codec.video.frameSize.width * 472  : 0)}
                    type="RGB" />

            </div>
            <VideoControls video={this.state.player} onDisplayModeChange={this.displayModeChange} />
            <VideoTimeline
                data={this.state.data}
                time={this.state.currentTime}
                frame={this.state.currentFrame}
                duration={this.state.video.duration}
                video={this.state.video}
                img={this.state.hist}
                onTimeChange={this.seekVideo}
                onRangesChange={this.rangesChange} />
        </div>
    )

    videoSelect = (files) =>
    {
        const VideoDecoder = require("video-decoder");

        const currentVideo = new VideoDecoder.Video(files[0].path);

        try
        {
            currentVideo.load();
            console.log("[DCR] Video loaded correctly.")

            const player = currentVideo.getReader();

            player.on('frame', this.renderFrame);
            player.togglePause(true);
            player.initialize();

            this.setState({ video: currentVideo, player: player });

            console.log(currentVideo);
        }
        catch (e)
        {
            console.log("[DCR] Unable to load the specified video.")
        }
    }

    handleDiscard()
    {
        this.setState({ video: null });
    }

    handleResult = (data, hist) =>
    {
        this.setState({ data: data, hist: hist });

        this._notificationSystem.addNotification({
            message: 'Analysis completed.',
            level: 'success',
            position: 'br'
        });
    }

    switchViewer = () =>
    {

        this.setState({ viewer: !this.state.viewer });
    }

    displayModeChange = (mode) =>
    {
        this.setState({ displayMode: mode });
    }

    renderFrame = async (frame) =>
    {
        let res = null;

        if (this.state.data)
        {
            let ranges = this.state.ranges;

            let currFrame = this.state.data.find((el) => el.index === frame.index);

            let rows = 300;
            let cols = 300;

            res = new cv.Mat(rows, cols, cv.CV_8UC3, [0, 0, 0]);

            for (var i = 0; i < ranges.length; i++)
            {
                let curr = ranges[i];

                let absThr = await currFrame.difference.inRange(curr.start, curr.end);

                let masked = curr.color.copyTo(res, absThr);
            }
        }

        this.setState(
        {
            currFrame: frame,
            overlayBuffer: this.state.data ? new Uint8Array(res.getData()) : null,
            currentTime: frame ? frame.time : 0,
            currentFrame: frame ? frame.index : 0
        });
    }

    seekVideo = (time) =>
    {
        this.state.player.seek(parseFloat(time.toFixed(3)));
    }

    zoomWindow = (start, end) =>
    {
    }

    rangesChange = (ranges) =>
    {
        let stream = this.defaultStream(this.state.video.streams, 'VIDEO');
        let w = 300;
        let h = 300;

        // - TODO: can improve performance by updating only changed ranges

        let rangeMatrix = [];

        if (true)
        {
            ranges.push({ value: 255, color: null });
            for (var i = 0; i < ranges.length - 1; i++)
            {
                let curr = ranges[i];
                let next = ranges[i + 1];
                let color = D3.rgb(curr.color);
                rangeMatrix.push(
                {
                    color: new cv.Mat(w, h, cv.CV_8UC3, [color.r, color.g, color.b]),
                    start: curr.value,
                    end: next.value
                });
            }
            ranges.pop();
        }

        this.setState({ ranges: rangeMatrix });
        this.renderFrame(this.state.currFrame);
    }

    defaultStream = (streams, type) => streams.find(stream => stream.codec.type == type);
}
