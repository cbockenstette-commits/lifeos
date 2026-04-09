import React from 'react';
import ReactDOM from 'react-dom/client';
import { HEALTH_CHECK_NAME } from '@lifeos/shared';
import App from './App';
import './index.css';

// P0 workspace-resolution proof: HEALTH_CHECK_NAME is imported from
// @lifeos/shared without any build step. If this type-checks and renders
// the correct value at runtime, the pnpm workspace plumbing is wired
// correctly and P1 can safely depend on this import pattern for Zod
// schemas and sprint date helpers.
console.log(`[lifeos] shared package resolved: ${HEALTH_CHECK_NAME}`);

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
