import React from 'react';
import { Switch, Route } from 'react-router';
import routes from './constants/routes';
import App from './containers/App';
import Interface from './containers/Interface';

export default () =>
(
    <App>
        <Switch>
            <Route path={routes.INTERFACE} component={Interface} />
        </Switch>
    </App>
);
