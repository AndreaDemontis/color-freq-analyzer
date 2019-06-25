import React, { Component } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import
{
	faUndo
} from '@fortawesome/free-solid-svg-icons'

// - Styles
import Style from './video-info.css'

export default class VideoInfo extends Component
{
    constructor(props)
    {
        super(props);

        this.state =
        {
            open: true
        }

        this.handleClick = this.handleClick.bind(this);
		this.discard = this.discard.bind(this);
    }

    render = () => this.renderInfo(this.props.video)

    renderInfo = (video) =>
    (
        <div className={Style.videoInformations} onClick={this.handleClick} style={{ height: this.state.open ? "260px" : "58px"}}>
            <div className={Style.preview} style={{ width: this.state.open ? "340px" : "70px", height: this.state.open ? "260px" : "58px" }}>
                <video width={this.state.open ? "340" : "70"} height={this.state.open ? "260" : "58"}>
                    <source id="mp4" src={video.filePath + ""} type="video/mp4" />
                </video>
            </div>
            <div className={Style.controls}>
                <div onClick={this.discard} className={Style.discardButton} style={{ position: 'relative', marginTop: '-10px', paddingLeft: '30px', color: '#3F1818', paddingTop: '5px', background: '#CE3D3D', marginRight: '10px', borderRadius: '5px', width: '48px'}}>
                    <FontAwesomeIcon icon={faUndo} onClick={this.playPause}  />
                    <div style={{ fontSize: '10px', position:'absolute', top: '23px', left: '-2px'}}>NEW VIDEO</div>
                </div>
                <div style={{ fontSize: '10px', marginTop: '0px', position: 'relative'}}>
                    <div style={{ fontSize: '16px', transform: this.state.open ? "rotate(-90deg)" : "rotate(0)"}}>▼</div>
                </div>
            </div>
            <div className={Style.informations} style={{ width: this.state.open ? "335px" : "500px"}}>
                <div className={Style.header}>
                    <div className={Style.title}>{/(^.*[\\\/])(.*)(\.[a-zA-Z0-9]+$)/.exec(video.filePath)[2]}</div>
                    <div className={Style.path}>{video.filePath}</div>
                    <br />
                    <ul className={Style.tags}>
                        <li>{this.defaultStream(video.streams, "VIDEO").codec.id}</li>
                        <li>{this.defaultStream(video.streams, "VIDEO").codec.video.format}</li>
                        <li>{this.defaultStream(video.streams, "AUDIO").codec.id}</li>
                        <li>{this.defaultStream(video.streams, "AUDIO").codec.audio.layout.replace('LAYOUT_', '')}</li>
                    </ul>
                </div>
                <table className={Style.table}>
                    <tbody>
                        <tr>
                            <td>FORMAT</td>
                            <td>
                                {this.defaultStream(video.streams, "VIDEO").codec.id} | {this.defaultStream(video.streams, "VIDEO").codec.video.format}
                            </td>
                        </tr>
                        <tr>
                            <td>FPS</td>
                            <td>
                                {
                                    ((f) => (f.num / f.den).toFixed(2) + " (" + (1 / (f.num / f.den) * 1000).toFixed(2) + "ms)")
                                    (this.defaultStream(video.streams, "VIDEO").codec.framerate)
                                }
                            </td>
                        </tr>
                        <tr>
                            <td>LENGTH</td>
                            <td>{video.duration}s ({this.defaultStream(video.streams, "VIDEO").frameCount} frames)</td>
                        </tr>
                        <tr>
                            <td>AUDIO</td>
                            <td>{((f) => f.codec.id + " | " + f.codec.audio.layout.replace('LAYOUT_', '') + " - " + f.codec.audio.format)(this.defaultStream(video.streams, "AUDIO"))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )

	discard(e)
	{
		e.stopPropagation();

		if (this.props.onDiscard)
			this.props.onDiscard();
	}

    handleClick()
    {
        this.setState({ open: !this.state.open });
    }

    defaultStream = (streams, type) => streams.find(stream => stream.codec.type == type);
}
