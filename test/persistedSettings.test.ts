import { describe, expect, test } from 'bun:test';
import { MAX_TARGET_KB, persistSettings, sanitizeSettings } from '../src/lib/persistedSettings';
import { type CompressionSettings, DEFAULT_SETTINGS } from '../src/types';

describe('sanitizeSettings', () => {
  test('keeps well-formed values', () => {
    expect(
      sanitizeSettings({
        format: 'avif',
        quality: 60,
        scale: 50,
        maintainAspectRatio: false,
        targetSize: 200 * 1024,
        paletteColors: 64,
        fullChroma: true,
        avifEffort: 'max',
        webpLossless: true,
      }),
    ).toEqual({
      format: 'avif',
      quality: 60,
      scale: 50,
      maintainAspectRatio: false,
      targetSize: 200 * 1024,
      paletteColors: 64,
      fullChroma: true,
      avifEffort: 'max',
      webpLossless: true,
    });
  });

  test('drops anything malformed or out of range', () => {
    expect(
      sanitizeSettings({
        format: 'bmp',
        quality: 101,
        scale: 33,
        maintainAspectRatio: 'yes',
        targetSize: (MAX_TARGET_KB + 1) * 1024,
      }),
    ).toEqual({});
    expect(sanitizeSettings({ quality: 50.5, targetSize: -1 })).toEqual({});
    expect(sanitizeSettings({ paletteColors: 1 })).toEqual({});
    expect(sanitizeSettings({ paletteColors: 257 })).toEqual({});
    expect(sanitizeSettings({ fullChroma: 'yes', avifEffort: 'turbo', webpLossless: 1 })).toEqual(
      {},
    );
  });

  test('ignores non-objects', () => {
    expect(sanitizeSettings(null)).toEqual({});
    expect(sanitizeSettings('webp')).toEqual({});
  });
});

describe('persistSettings', () => {
  type State = { settings: CompressionSettings };
  const options = persistSettings<State>('test', ['format', 'quality', 'targetSize']);
  const current: State = { settings: { ...DEFAULT_SETTINGS } };

  test('stores only the chosen keys', () => {
    const state: State = { settings: { ...DEFAULT_SETTINGS, width: 800, height: 600 } };
    expect(options.partialize!(state)).toEqual({ settings: { format: 'webp', quality: 85 } });
  });

  test('restores valid stored values over the defaults', () => {
    const merged = options.merge!({ settings: { format: 'jpeg', quality: 70 } }, current);
    expect(merged.settings).toEqual({ ...DEFAULT_SETTINGS, format: 'jpeg', quality: 70 });
  });

  test('never restores keys it was not asked to remember', () => {
    const merged = options.merge!({ settings: { scale: 50, width: 10 } }, current);
    expect(merged.settings).toEqual(DEFAULT_SETTINGS);
  });

  test('survives a corrupted entry', () => {
    expect(options.merge!(undefined, current).settings).toEqual(DEFAULT_SETTINGS);
    expect(options.merge!({ settings: 'oops' }, current).settings).toEqual(DEFAULT_SETTINGS);
  });
});
