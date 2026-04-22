import { describe, it, expect } from "bun:test";
import { sanitizeRedirect } from "./utils";

describe("sanitizeRedirect", () => {
  it("should return the original URL if it is a valid relative path", () => {
    expect(sanitizeRedirect("/valid/path")).toBe("/valid/path");
    expect(sanitizeRedirect("/another-path?query=1")).toBe("/another-path?query=1");
  });

  it("should return the fallback URL if the URL is empty or null", () => {
    expect(sanitizeRedirect("")).toBe("/app");
    expect(sanitizeRedirect(null)).toBe("/app");
    expect(sanitizeRedirect(undefined)).toBe("/app");
  });

  it("should return the fallback URL if the URL is absolute", () => {
    expect(sanitizeRedirect("http://example.com")).toBe("/app");
    expect(sanitizeRedirect("https://malicious.com")).toBe("/app");
    expect(sanitizeRedirect("javascript:alert(1)")).toBe("/app");
  });

  it("should return the fallback URL if the URL is protocol-relative", () => {
    expect(sanitizeRedirect("//example.com")).toBe("/app");
  });

  it("should return the fallback URL if the URL starts with a backslash", () => {
    expect(sanitizeRedirect("/\\example.com")).toBe("/app");
    expect(sanitizeRedirect("\\example.com")).toBe("/app");
  });

  it("should use the provided fallback URL", () => {
    expect(sanitizeRedirect("//example.com", "/home")).toBe("/home");
  });
});
