import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root is missing.');

// Decode the preloaded UI font before measuring and painting the charts.
try {
  await document.fonts.load('16px "DM Sans UI"');
} catch {
  /* Keep the app usable with fallback fonts if decoding fails. */
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The generated HTML contains the default light view. Other saved views render normally.
let defaultTheme = true;
try {
  defaultTheme = localStorage.getItem('benchmark-theme') !== 'dark';
} catch {
  /* Storage is optional. */
}
if (root.hasChildNodes() && !location.search && defaultTheme) hydrateRoot(root, app);
else createRoot(root).render(app);
