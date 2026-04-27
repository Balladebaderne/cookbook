import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use an in-memory SQLite DB for tests so they don't touch the dev DB file.
    env: {
      DB_PATH: ":memory:",
    },
  },
});
