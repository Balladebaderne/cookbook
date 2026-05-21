import http from "http";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db/schema.js";
import client from "prom-client";

import apiRoutes from "./routes/api.js";
import recipeRoutes from "./routes/recipes.js";
import { createRouter, defineRoute } from "./http/router.js";
import { sendJson } from "./http/responses.js";
import { createSwaggerRoutes } from "./http/swagger.js";
import { errorHandler, notFound } from "./middleware/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// ── Prometheus metrics ────────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});
// ─────────────────────────────────────────────────────────────────────────────

// Load OpenAPI spec
const swaggerDocument = YAML.load(path.join(__dirname, "..", "openapi.yaml"));


function createRoutes() {
  return [
    defineRoute("GET", "/health", async ({ res }) => {
      sendJson(res, 200, {
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }),
    ...createSwaggerRoutes(swaggerDocument),
    ...apiRoutes,
    ...recipeRoutes,
  ];
}

// Track request durations
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path ?? req.path,
      status_code: res.statusCode,
    });
  });
  next();
});

// Swagger UI
app.use("/apidocs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
}

// Prometheus metrics endpoint (scraped by prometheus service)
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(String(err));
  }
});

// samme base paths som Flask
app.use("/api", apiRouter);
app.use("/api/recipe", recipesRouter);

export async function startServer(port = PORT, host = "0.0.0.0") {
  const server = await createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  console.log(`Node API running: http://localhost:${port}`);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
