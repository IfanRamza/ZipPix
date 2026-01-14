import { describe, expect, test } from "bun:test";
import {
  calculateReduction,
  cn,
  formatBytes,
  generateOutputFilename,
  sanitizeFilename,
  validateFileType,
} from "../src/lib/utils";

describe("sanitizeFilename", () => {
  test("removes dangerous characters", () => {
    const result = sanitizeFilename('file<>:"/\\|?*.jpg');
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result.endsWith(".jpg")).toBe(true);
  });

  test("handles files with extension", () => {
    const result = sanitizeFilename("my_file.jpg");
    expect(result.endsWith(".jpg")).toBe(true);
  });

  test("limits length", () => {
    const longName = "a".repeat(300) + ".jpg";
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(110); // 100 base + extension
  });

  test("handles empty string", () => {
    const result = sanitizeFilename("");
    expect(result).toBe("unnamed");
  });
});

describe("formatBytes", () => {
  test("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
  });

  test("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 Bytes");
  });

  test("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  test("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
  });

  test("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });
});

describe("validateFileType", () => {
  test("accepts JPEG", () => {
    expect(validateFileType("image/jpeg")).toBe(true);
  });

  test("accepts PNG", () => {
    expect(validateFileType("image/png")).toBe(true);
  });

  test("accepts WebP", () => {
    expect(validateFileType("image/webp")).toBe(true);
  });

  test("accepts AVIF", () => {
    expect(validateFileType("image/avif")).toBe(true);
  });

  test("accepts GIF", () => {
    expect(validateFileType("image/gif")).toBe(true);
  });

  test("rejects invalid types", () => {
    expect(validateFileType("image/bmp")).toBe(false);
    expect(validateFileType("application/pdf")).toBe(false);
  });
});

describe("calculateReduction", () => {
  test("calculates positive reduction", () => {
    expect(calculateReduction(1000, 500)).toBe(50);
    expect(calculateReduction(1000, 250)).toBe(75);
  });

  test("handles zero original size", () => {
    expect(calculateReduction(0, 500)).toBe(0);
  });

  test("handles same size", () => {
    expect(calculateReduction(1000, 1000)).toBe(0);
  });
});

describe("generateOutputFilename", () => {
  test("generates filename with new format", () => {
    const result = generateOutputFilename("photo.jpg", "webp");
    expect(result.endsWith(".webp")).toBe(true);
    expect(result).toContain("photo");
  });
});

describe("cn (class names)", () => {
  test("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  test("handles conditional classes", () => {
    const isActive = true;
    const isHidden = false;
    const result = cn("base", isActive && "active", isHidden && "hidden");
    expect(result).toBe("base active");
  });
});
