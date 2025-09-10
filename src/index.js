import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App';
import { AUTH0_CONFIG } from './config/constants';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <Auth0Provider
    domain={AUTH0_CONFIG.DOMAIN}
    clientId={AUTH0_CONFIG.CLIENT_ID}
    authorizationParams={{
      redirect_uri: AUTH0_CONFIG.REDIRECT_URI,
      audience: AUTH0_CONFIG.AUDIENCE,
      scope: AUTH0_CONFIG.SCOPE,
    }}
  >
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Auth0Provider>,
);

