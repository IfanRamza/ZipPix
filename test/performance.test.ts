import { describe, expect, test } from 'bun:test';
import { calculateReduction, sanitizeFilename } from '../src/lib/utils';

describe('Performance Benchmarks', () => {
  test('calculateReduction performance (10k iterations)', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      calculateReduction(1000000, 500000);
    }
    const end = performance.now();
    const duration = end - start;
    console.log(`calculateReduction 10k ops: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50); // Should be extremely fast
  });

  test('sanitizeFilename performance (10k iterations)', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      sanitizeFilename('very-long-filename-with-strange-chars-and-symbols.jpg');
    }
    const end = performance.now();
    const duration = end - start;
    console.log(`sanitizeFilename 10k ops: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(200);
  });
});
