/**
 * Jest setup file
 * Configures test environment before running tests
 */

import '@testing-library/jest-dom';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local for tests
config({ path: resolve(__dirname, '.env.local') });

// Mock window.location (only in jsdom environment)
if (typeof window !== 'undefined') {
  delete (window as any).location;
  window.location = {
  href: '',
  origin: 'http://localhost',
  protocol: 'http:',
  host: 'localhost',
  hostname: 'localhost',
  port: '',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  reload: jest.fn(),
  replace: jest.fn(),
  toString: jest.fn(() => 'http://localhost/'),
    ancestorOrigins: {} as DOMStringList,
  } as Location;

  // Mock window.history.replaceState
  window.history.replaceState = jest.fn();
}

// Suppress console errors for navigation warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Not implemented: navigation')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
