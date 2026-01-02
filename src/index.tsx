import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import './i18n';

import TimeAgo from 'javascript-time-ago';

import en from 'javascript-time-ago/locale/en';
import es from 'javascript-time-ago/locale/es-AR';

TimeAgo.addDefaultLocale(en);
TimeAgo.addLocale(es);

// Suppress only resource loading errors (images, fonts, stylesheets)
// This prevents annoying errors for missing album art or assets
window.addEventListener('error', (e) => {
  // Only ignore resource loading errors, not JavaScript errors
  if (e.target && (e.target as any).tagName) {
    const tagName = (e.target as any).tagName.toUpperCase();
    // Only suppress errors from IMG, LINK, and SCRIPT tags
    if (tagName === 'IMG' || tagName === 'LINK' || tagName === 'SCRIPT') {
      e.stopPropagation();
      e.preventDefault();
      return false;
    }
  }
}, true);

// Hide webpack error overlay if configured
if (process.env.REACT_APP_NO_ERROR_OVERLAY === 'true' && process.env.NODE_ENV === 'development') {
  const style = document.createElement('style');
  style.textContent = `
    iframe[src*="webpack"] {
      display: none !important;
    }
    #webpack-dev-server-client-overlay,
    #webpack-dev-server-client-overlay-div {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
