import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Apply dark mode from localStorage on initial load
// This prevents flash of incorrect theme
const savedTheme = localStorage.getItem('prodomo_theme');
if (savedTheme !== null) {
  const isDark = JSON.parse(savedTheme);
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  // Apply dark mode based on system preference if no saved preference
  document.documentElement.classList.add('dark');
}

// Add theme-transition class after a small delay to prevent transition on page load
setTimeout(() => {
  document.documentElement.classList.add('theme-transition');
}, 100);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);