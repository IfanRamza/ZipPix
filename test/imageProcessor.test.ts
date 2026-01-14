import { describe, expect, test } from "bun:test";
import {
  getFileExtension,
  getImageDimensions,
  getMimeType,
} from "../src/lib/imageProcessor";

describe("getMimeType", () => {
  test("returns correct MIME types", () => {
    expect(getMimeType("jpeg")).toBe("image/jpeg");
    expect(getMimeType("png")).toBe("image/png");
    expect(getMimeType("webp")).toBe("image/webp");
    expect(getMimeType("avif")).toBe("image/avif");
  });
});

describe("getFileExtension", () => {
  test("returns correct extensions", () => {
    expect(getFileExtension("jpeg")).toBe("jpg");
    expect(getFileExtension("png")).toBe("png");
    expect(getFileExtension("webp")).toBe("webp");
    expect(getFileExtension("avif")).toBe("avif");
  });
});

describe("getImageDimensions", () => {
  test("exports function", () => {
    expect(typeof getImageDimensions).toBe("function");
  });
});
