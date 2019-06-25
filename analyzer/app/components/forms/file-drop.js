import React, { Component } from 'react';

// - Styles
import Style from './file-drop.css'

export default class FileDrop extends Component
{
    dropRef = React.createRef()
    dialog = React.createRef()

    constructor(props)
    {
        super(props);

        this.dragCounter = 0;
        this.state =
        {
            hover: false
        }
    }

    componentDidMount()
    {
        let div = this.dropRef.current
        div.addEventListener('dragenter', this.handleDragIn)
        div.addEventListener('dragleave', this.handleDragOut)
        div.addEventListener('dragover', this.handleDrag)
        div.addEventListener('click', this.handleClick)
        div.addEventListener('drop', this.handleDrop)
    }

    componentWillUnmount()
    {
        let div = this.dropRef.current
        div.removeEventListener('dragenter', this.handleDragIn)
        div.removeEventListener('dragleave', this.handleDragOut)
        div.removeEventListener('dragover', this.handleDrag)
        div.removeEventListener('click', this.handleClick)
        div.removeEventListener('drop', this.handleDrop)
    }

    containerClass = () => `${Style.container} ${this.state.hover ? Style.drag : ""}`

    render = () =>
    (
        <div className={this.containerClass()} ref={this.dropRef}>
            <input type="file" ref={this.dialog} style={{ display: 'none' }} />
            {this.props.children}
        </div>
    )

    handleClick = (e) =>
    {
        e.preventDefault();
        e.stopPropagation();

        var input = document.createElement('input');
        input.type = 'file';

        input.onchange = e =>
        {
            if (this.props.onFile)
                this.props.onFile(e.target.files);
        }

        input.click();
    }

    handleDrag = (e) =>
    {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragIn = (e) =>
    {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter++;

        if (e.dataTransfer.items && e.dataTransfer.items.length > 0)
            this.setState({ hover: true });
    }

    handleDragOut = (e) =>
    {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter--;

        if (this.dragCounter > 0) return;

        this.setState({ hover: false });

    }

    handleDrop = (e) =>
    {
        e.preventDefault();
        e.stopPropagation();

        this.setState({ hover: false });

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0)
        {
            if (this.props.onFile)
                this.props.onFile(e.dataTransfer.files);

            e.dataTransfer.clearData();
            this.dragCounter = 0;
        }
    }

}
