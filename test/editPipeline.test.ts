import { describe, expect, test } from 'bun:test';
import {
  buildCssFilter,
  getEditedSize,
  getOutputSize,
  hasEdits,
  hasGeometryEdits,
} from '../src/lib/editPipeline';
import { DEFAULT_EDIT_STATE, DEFAULT_SETTINGS } from '../src/types';

const photo = { width: 4000, height: 3000 };

describe('getEditedSize', () => {
  test('returns source size without edits', () => {
    expect(getEditedSize(photo, DEFAULT_EDIT_STATE)).toEqual(photo);
  });

  test('uses crop size', () => {
    const edit = { ...DEFAULT_EDIT_STATE, crop: { x: 10, y: 10, width: 1000, height: 500 } };
    expect(getEditedSize(photo, edit)).toEqual({ width: 1000, height: 500 });
  });

  test('swaps dimensions when rotated sideways', () => {
    expect(getEditedSize(photo, { ...DEFAULT_EDIT_STATE, rotation: 90 })).toEqual({
      width: 3000,
      height: 4000,
    });
    expect(getEditedSize(photo, { ...DEFAULT_EDIT_STATE, rotation: 180 })).toEqual(photo);
  });
});

describe('getOutputSize', () => {
  test('scale is relative to the edited image', () => {
    expect(getOutputSize(photo, { ...DEFAULT_SETTINGS, scale: 50 })).toEqual({
      width: 2000,
      height: 1500,
    });
  });

  test('a square crop scaled to 50% stays square (no stretching)', () => {
    const square = { width: 1000, height: 1000 };
    expect(getOutputSize(square, { ...DEFAULT_SETTINGS, scale: 50 })).toEqual({
      width: 500,
      height: 500,
    });
  });

  test('explicit width keeps aspect ratio', () => {
    expect(getOutputSize(photo, { ...DEFAULT_SETTINGS, width: 800 })).toEqual({
      width: 800,
      height: 600,
    });
  });

  test('both dimensions with aspect lock fit inside the box', () => {
    const portrait = { width: 3000, height: 4000 };
    const out = getOutputSize(portrait, { ...DEFAULT_SETTINGS, width: 1000, height: 1000 });
    expect(out.height).toBeLessThanOrEqual(1000);
    expect(out.width).toBe(750);
  });

  test('both dimensions without aspect lock are used as-is', () => {
    expect(
      getOutputSize(photo, {
        ...DEFAULT_SETTINGS,
        width: 100,
        height: 100,
        maintainAspectRatio: false,
      }),
    ).toEqual({ width: 100, height: 100 });
  });

  test('never returns zero-sized output', () => {
    const out = getOutputSize({ width: 3, height: 1 }, { ...DEFAULT_SETTINGS, scale: 25 });
    expect(out.width).toBeGreaterThanOrEqual(1);
    expect(out.height).toBeGreaterThanOrEqual(1);
  });
});

describe('edit helpers', () => {
  test('buildCssFilter maps -100..100 to 0..2', () => {
    expect(buildCssFilter(DEFAULT_EDIT_STATE)).toBe('none');
    expect(
      buildCssFilter({ ...DEFAULT_EDIT_STATE, brightness: 50, contrast: -50, saturation: 100 }),
    ).toBe('brightness(1.5) contrast(0.5) saturate(2)');
  });

  test('hasEdits / hasGeometryEdits', () => {
    expect(hasEdits(DEFAULT_EDIT_STATE)).toBe(false);
    expect(hasEdits({ ...DEFAULT_EDIT_STATE, saturation: 5 })).toBe(true);
    expect(hasGeometryEdits({ ...DEFAULT_EDIT_STATE, saturation: 5 })).toBe(false);
    expect(hasGeometryEdits({ ...DEFAULT_EDIT_STATE, flipVertical: true })).toBe(true);
  });
});
