import React, { Component } from 'react';

// - Styles
import Style from './video-title.css'

export default class VideoTitle extends Component
{
	constructor(props)
	{
		super(props);

	}


	render = () =>
	(
        <div className={Style.container} onClick={this.props.onclick}>
            <video height="70">
                <source id="mp4" src={this.props.video.filePath + ""} type="video/mp4" />
            </video>
            <div className={Style.info}>
                <div className={Style.title}>
                    {/(^.*[\\\/])(.*)(\.[a-zA-Z0-9]+$)/.exec(this.props.video.filePath)[2]}
                </div>
                <div className={Style.path}>{this.props.video.filePath}</div>
            </div>
			<div className={Style.goUp}>
				Back to analyzer
			</div>
        </div>
	)

	static defaultProps =
	{
        video: null
	}

	componentDidMount()
	{

    }
}
