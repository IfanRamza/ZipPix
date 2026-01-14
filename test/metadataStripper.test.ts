import { describe, expect, test } from "bun:test";
import {
  extractMetadata,
  getMetadataSummary,
  stripMetadata,
} from "../src/lib/metadataStripper";

describe("extractMetadata", () => {
  test("exports function", () => {
    expect(typeof extractMetadata).toBe("function");
  });
});

describe("stripMetadata", () => {
  test("exports function", () => {
    expect(typeof stripMetadata).toBe("function");
  });
});

describe("getMetadataSummary", () => {
  test("exports function", () => {
    expect(typeof getMetadataSummary).toBe("function");
  });
});
