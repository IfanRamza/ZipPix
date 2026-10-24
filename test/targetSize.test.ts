import { describe, expect, test } from 'bun:test';
import { encodeToTarget, MAX_TARGET_QUALITY } from '../src/lib/targetSize';

/** Fake encoder: size grows linearly with quality, and records every call */
function fakeEncoder(bytesPerQuality: number, base = 0) {
  const calls: number[] = [];
  const encodeAt = async (q: number) => {
    calls.push(q);
    return new Blob([new Uint8Array(base + q * bytesPerQuality)]);
  };
  return { encodeAt, calls };
}

describe('encodeToTarget', () => {
  test('uses the top quality in one encode when it already fits', async () => {
    const { encodeAt, calls } = fakeEncoder(10);
    const result = await encodeToTarget(encodeAt, 10_000);
    expect(result).toMatchObject({ quality: MAX_TARGET_QUALITY, targetMet: true });
    expect(calls).toEqual([MAX_TARGET_QUALITY]);
  });

  test('finds the highest quality that fits', async () => {
    const { encodeAt } = fakeEncoder(100); // q60 = 6000 bytes
    const result = await encodeToTarget(encodeAt, 6_050);
    expect(result.quality).toBe(60);
    expect(result.targetMet).toBe(true);
    expect(result.blob.size).toBeLessThanOrEqual(6_050);
  });

  test('stays within a handful of encodes', async () => {
    const { encodeAt, calls } = fakeEncoder(100);
    await encodeToTarget(encodeAt, 3_333);
    expect(calls.length).toBeLessThanOrEqual(8);
  });

  test('returns the smallest result and flags a miss when nothing fits', async () => {
    const { encodeAt } = fakeEncoder(1, 50_000);
    const result = await encodeToTarget(encodeAt, 1_000);
    expect(result.targetMet).toBe(false);
    expect(result.quality).toBe(1);
    expect(result.blob.size).toBe(50_001);
  });

  test('handles a target exactly at a boundary', async () => {
    const { encodeAt } = fakeEncoder(100);
    const result = await encodeToTarget(encodeAt, 100); // only q1 fits
    expect(result).toMatchObject({ quality: 1, targetMet: true });
  });
});
