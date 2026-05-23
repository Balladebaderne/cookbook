import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
  },
});
