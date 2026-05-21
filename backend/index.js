import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db/schema.js";
import client from "prom-client";

import apiRouter from "./routes/api.js";
import recipesRouter from "./routes/recipes.js";
import { errorHandler, notFound } from "./middleware/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

await initDb();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

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
});

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

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Node API running: http://localhost:${PORT}`);
});
