import React from 'react';
import Root from './containers/Root';

import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { configureStore, history } from './store/configureStore';

import './app.global.css';

const store = configureStore();

const rootElement =
    <AppContainer>
        <Root store={store} history={history} />
    </AppContainer>


render(rootElement, document.getElementById('root'));

if (module.hot)
{
    module.hot.accept('./containers/Root', () =>
    {
        // eslint-disable-next-line global-require
        const NextRoot = require('./containers/Root').default;

        const rootElement =
            <AppContainer>
                <NextRoot store={store} history={history} />
            </AppContainer>

        render(rootElement, document.getElementById('root'));
    });
}
