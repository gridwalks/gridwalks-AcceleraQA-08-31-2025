import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { validateEnvironment } from './config/constants';

// Validate required environment configuration before app initialization.
// The check is skipped during production builds to prevent build failures on
// hosts (like Netlify) where some variables may not be set at compile time.
if (process.env.NODE_ENV !== 'production') {
  validateEnvironment();
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

