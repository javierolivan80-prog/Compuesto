import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// lightweight-charts necesita canvas y matchMedia reales: en jsdom se sustituye por un doble inerte.
// El dibujo real se comprueba en los e2e (Playwright).
vi.mock('lightweight-charts', () => ({
  ColorType: { Solid: 'solid' },
  CandlestickSeries: 'candlestick',
  createChart: () => ({
    addSeries: () => ({ setData: () => undefined }),
    timeScale: () => ({ fitContent: () => undefined }),
    applyOptions: () => undefined,
    remove: () => undefined,
  }),
}));
