import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getEnvOrDummy } from "./supabase";

describe("supabase.ts: getEnvOrDummy()", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Reset environment before each test to guarantee isolated states
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        // Restore environment
        process.env = { ...originalEnv };
    });

    it("should return the environment variable if it exists", () => {
        const dummy = "dummy-value";
        const result = getEnvOrDummy("actual-secret-value", dummy, "TEST_VAR");
        expect(result).toBe("actual-secret-value");
    });

    it("should return the dummy value if env var is missing but NODE_ENV is test", () => {
        process.env.NODE_ENV = "test";
        const dummy = "dummy-value";
        const result = getEnvOrDummy(undefined, dummy, "TEST_VAR");
        expect(result).toBe(dummy);
    });

    it("should return the dummy value on server if env var is missing but CI is true", () => {
        process.env.NODE_ENV = "production";
        process.env.CI = "true";
        const dummy = "dummy-value";
        const result = getEnvOrDummy(undefined, dummy, "TEST_VAR");
        expect(result).toBe(dummy);
    });

    it("should throw an error on client even if CI is true (if not test env)", () => {
        process.env.NODE_ENV = "production";
        process.env.CI = "true";
        const dummy = "dummy-value";

        // Mock window to simulate client-side execution
        const originalWindow = global.window;
        (global as any).window = {};

        expect(() => {
            getEnvOrDummy(undefined, dummy, "TEST_VAR");
        }).toThrow("Missing required environment variable: TEST_VAR");

        // Restore window
        if (originalWindow === undefined) {
            delete (global as any).window;
        } else {
            (global as any).window = originalWindow;
        }
    });

    it("should throw an error if env var is missing in production environment", () => {
        process.env.NODE_ENV = "production";
        delete process.env.CI; // Ensure CI is false
        const dummy = "dummy-value";

        expect(() => {
            getEnvOrDummy(undefined, dummy, "TEST_VAR");
        }).toThrow("Missing required environment variable: TEST_VAR");
    });
});
