import { expect, test } from "bun:test";
import { generateId } from "./utils";

test("generateId creates 16 character string", () => {
  const id = generateId();
  expect(typeof id).toBe("string");
  expect(id.length).toBe(16);
});

test("generateId creates alphanumeric string without hyphens", () => {
  const id = generateId();
  expect(id).toMatch(/^[a-zA-Z0-9]+$/);
});

test("generateId creates unique strings", () => {
  const id1 = generateId();
  const id2 = generateId();
  expect(id1).not.toBe(id2);
});
