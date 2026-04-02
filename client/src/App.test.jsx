import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import App from './App';

// Mock components that might fail in JSDOM (Leaflet, etc)
vi.mock('./components/LiveMap', () => ({
  default: () => <div data-testid="live-map">Mock Map</div>
}));

vi.mock('./components/CustomCursor', () => ({
  default: () => <div data-testid="custom-cursor">Mock Cursor</div>
}));

test('renders BRINGIT landing page', () => {
  render(
    <App />
  );
  const titleElement = screen.getByText(/BRINGIT/i);
  expect(titleElement).toBeDefined();
});

test('renders LOGIN and JOIN NETWORK buttons', () => {
  render(
    <App />
  );
  expect(screen.getByText(/LOGIN/i)).toBeDefined();
  expect(screen.getByText(/JOIN NETWORK/i)).toBeDefined();
});
