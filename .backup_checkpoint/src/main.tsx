import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  };
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args.map((a) => String(a)).join(' ');
    if (
      msg.includes('Distance Matrix Service:') ||
      msg.includes('Directions Service:') ||
      msg.includes('exceeded your daily request quota') ||
      msg.includes('OverQuotaMapError') ||
      msg.includes('QuotaExceededError')
    ) {
      console.warn('[Google Maps Platform Notice]:', ...args);
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      return;
    }
    origError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

