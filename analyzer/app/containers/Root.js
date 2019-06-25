// @flow
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'connected-react-router';
import type { Store } from '../reducers/types';
import Routes from '../Routes';

type Props =
{
    store: Store,
    history: {}
};

export default class Root extends Component<Props>
{
    render = () =>
    (
        <Provider store={this.props.store}>
            <ConnectedRouter history={this.props.history}>
                <Routes />
            </ConnectedRouter>
        </Provider>
    );
}
