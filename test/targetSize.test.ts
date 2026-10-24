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
    expect(calls.length).toBeLessThanOrEqual(9);
  });

  /** Real encoders: size roughly doubles every ~12 quality steps */
  const exponential = (q: number) => Math.round(1_000 * 2 ** (q / 12));

  test('needs fewer encodes than bisection on realistic size curves', async () => {
    let total = 0;
    let runs = 0;
    for (
      let target = exponential(2);
      target < exponential(94);
      target = Math.round(target * 1.07)
    ) {
      let calls = 0;
      await encodeToTarget(
        async (q) => (calls++, new Blob([new Uint8Array(exponential(q))])),
        target,
      );
      total += calls;
      runs++;
    }
    // Plain bisection over 1–94 plus the top probe takes ~7.6 encodes
    expect(total / runs).toBeLessThan(5);
  });

  test('always returns the highest quality that fits on monotone curves', async () => {
    let seed = 42;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let curve = 0; curve < 40; curve++) {
      // Random increasing curve with plateaus and jumps
      const sizes: number[] = [];
      for (let q = 1, s = 500; q <= 95; q++) sizes.push((s += Math.floor(random() ** 3 * 4_000)));
      for (let i = 0; i < 25; i++) {
        const target = Math.floor(sizes[0] * 0.9 + random() * sizes[94]);
        const truth = sizes.findLastIndex((size) => size <= target) + 1;
        const result = await encodeToTarget(
          async (q) => new Blob([new Uint8Array(sizes[q - 1])]),
          target,
        );
        if (truth === 0) expect(result.targetMet).toBe(false);
        else expect(result).toMatchObject({ quality: truth, targetMet: true });
      }
    }
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
