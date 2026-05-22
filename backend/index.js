import http from "http";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db/schema.js";
import client from "prom-client";

import apiRoutes from "./routes/api.js";
import recipeRoutes from "./routes/recipes.js";
import userRoutes from "./routes/users.js";
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
    defineRoute("GET", "/metrics", async ({ res }) => {
      try {
        res.setHeader("Content-Type", register.contentType);
        res.end(await register.metrics());
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    }),
    ...createSwaggerRoutes(swaggerDocument),
    ...apiRoutes,
    ...userRoutes,
    ...recipeRoutes,
  ];
}

export function createApp() {
  const handler = createRouter(createRoutes(), {
    onError: errorHandler,
    onNotFound: notFound,
  });

  // Wrap handler with Prometheus request duration tracking
  return function instrumentedHandler(req, res) {
    const end = httpRequestDuration.startTimer();
    res.on("finish", () => {
      end({
        method: req.method,
        route: req.url?.split("?")[0] ?? "/",
        status_code: res.statusCode,
      });
    });
    return handler(req, res);
  };
}

export async function createServer() {
  await initDb();
  return http.createServer(createApp());
}

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
