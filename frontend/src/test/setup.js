import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// jsdom (v29) does not expose a usable window.localStorage by default, and
// auth.js reads it on mount via getAuthToken(). Provide a small in-memory
// implementation so component tests render deterministically.
const store = new Map();

vi.stubGlobal("localStorage", {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
});

beforeEach(() => store.clear());
