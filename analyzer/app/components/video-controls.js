import React, { Component } from 'react';

// - Styles
import Style from './video-controls.css'

// -
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import
{
	faPlay, faPause,
	faStepBackward, faStepForward,
	faColumns
} from '@fortawesome/free-solid-svg-icons'
import
{
	faWindowMaximize
} from '@fortawesome/free-regular-svg-icons'

export default class VideoTitle extends Component
{
	constructor(props)
	{
		super(props);

		this.state =
		{
			paused: true,
			displayMode: 'single'
		}

		this.playPause = this.playPause.bind(this);
		this.stepBack = this.stepBack.bind(this);
		this.stepNext = this.stepNext.bind(this);
	}


	render = () =>
	(
        <div className={Style.container}>
			<div className={Style.left}>
				<FontAwesomeIcon icon={this.state.paused ? faPlay : faPause} onClick={this.playPause} className={Style.spacer} />
				<FontAwesomeIcon icon={faStepBackward} onClick={this.stepBack} transform="shrink-4" />
				<FontAwesomeIcon icon={faStepForward} onClick={this.stepNext} transform="shrink-4" className={Style.spacer} />
			</div>
			<div className={Style.right}>
				<label>
					<input type="radio" checked={this.state.displayMode === 'single'} onChange={() => {}} />
					<FontAwesomeIcon icon={faWindowMaximize} onClick={() => { this.setState({ displayMode : 'single'}); }} />
				</label>
				<label>
					<input type="radio" checked={this.state.displayMode === 'split'} onChange={() => {}} />
					<FontAwesomeIcon icon={faColumns} onClick={() => { this.setState({ displayMode : 'split'}); }} />
				</label>
			</div>
        </div>
	)

	static defaultProps =
	{
        video: null
	}

	componentWillUpdate(nextProps, nextState)
	{
		if (this.state.displayMode !== nextState.displayMode && this.props.onDisplayModeChange)
			this.props.onDisplayModeChange(nextState.displayMode)
	}

	playPause()
	{
		if (this.props.video)
			this.setState({ paused: !this.state.paused });

		if (this.props.video)
			this.props.video.togglePause(!this.state.paused);
	}

	stepBack()
	{
		if (this.props.video)
			this.props.video.prevFrame();
	}

	stepNext()
	{
		if (this.props.video)
			this.props.video.nextFrame();
	}
}
