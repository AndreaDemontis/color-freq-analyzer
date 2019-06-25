import React, { Component } from 'react';

// - Styles
import Style from './start-button.css'

export default class StartButton extends Component
{

    constructor(props)
    {
        super(props);

        this.state =
        {
            class: Style.button,
            progg: 0
        }
    }

    render = () =>
    (
        <div className={Style.container}>
            <button className={this.state.class} onClick={this.handleClick} style={{ borderLeftWidth: this.props.proggress / 100 * 240 + 3 + "px" }}>
                <div className={Style.content} style={{ transform: this.props.state === 'idle' ? '' : 'scale(0,0)' }}>
                    {this.props.children}
                </div>
            </button>
        </div>
    )

    handleClick = (e) =>
    {
        e.preventDefault();
        e.stopPropagation();

        if (this.props.state === 'idle' && this.props.onClick)
            this.props.onClick(e);

    }


    componentWillUpdate(nextProps, nextState)
	{
        if (this.props.state !== nextProps.state)
        {
            switch (nextProps.state)
            {
                case 'idle':
                    this.setState({ class: Style.button });
                    break;
                case 'proggress':
                    this.setState({ class: Style.proggress });
                    break;
                default:
            }
        }
    }
}
