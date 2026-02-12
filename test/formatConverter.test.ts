import { describe, expect, test } from 'bun:test';
import { convertFormat, getSupportedFormats, isFormatSupported } from '../src/lib/formatConverter';

// Note: These functions use browser canvas APIs which aren't available in Bun test runtime
// These tests verify exports only; integration tests require a browser environment

describe('isFormatSupported', () => {
  test('exports function', () => {
    expect(typeof isFormatSupported).toBe('function');
  });
});

describe('getSupportedFormats', () => {
  test('exports function', () => {
    expect(typeof getSupportedFormats).toBe('function');
  });
});

describe('convertFormat', () => {
  test('exports function', () => {
    expect(typeof convertFormat).toBe('function');
  });
});
