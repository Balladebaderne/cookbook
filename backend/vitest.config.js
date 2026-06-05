import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // All test files share one Postgres and each calls initDb() on startup. Run
    // in parallel they race on schema creation — CREATE TABLE IF NOT EXISTS isn't
    // atomic in Postgres, so concurrent callers collide on the pg_type catalog
    // ("duplicate key ... pg_type_typname_nsp_index") and intermittently fail CI.
    // Run files serially to make the suite deterministic; runtime is ~1s anyway.
    fileParallelism: false,

    // Tests run against a real Postgres. CI provides one via a `services: postgres`
    // block; locally, `docker compose --profile dev up -d` brings one up on
    // 127.0.0.1:5432. Override via POSTGRES_* env if your setup differs.
    env: {
      POSTGRES_HOST: process.env.POSTGRES_HOST || "127.0.0.1",
      POSTGRES_PORT: process.env.POSTGRES_PORT || "5432",
      POSTGRES_DB: process.env.POSTGRES_DB || "cookbook",
      POSTGRES_USER: process.env.POSTGRES_USER || "cookbook",
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "cookbook",
    },
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      // lcov is consumed by SonarQube Cloud; the others are for humans locally.
      reporter: ["text-summary", "html", "lcov"],
      include: ["src/**/*.js"],
      exclude: ["**/*.test.js"],
      thresholds: {
        lines: 70,
        statements: 70,
      },
    },
  },
});
