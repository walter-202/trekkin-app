// Polyfill minimal browser globals for React Native / Hermes runtime to prevent crashes on web imports
if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({ setAttribute: () => {}, style: {} }),
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof localStorage === 'undefined') {
  const memStorage: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => memStorage[key] ?? null,
    setItem: (key: string, val: string) => { memStorage[key] = val; },
    removeItem: (key: string) => { delete memStorage[key]; },
    clear: () => { Object.keys(memStorage).forEach((k) => delete memStorage[k]); },
  };
}

import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
