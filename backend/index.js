import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db/schema.js";

import apiRouter from "./routes/api.js";
import recipesRouter from "./routes/recipes.js";
import { errorHandler, notFound } from "./middleware/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI spec
const swaggerDocument = YAML.load(path.join(__dirname, "..", "openapi.yaml"));

await initDb();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Swagger UI
app.use("/apidocs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString() 
  });
});

// samme base paths som Flask
app.use("/api", apiRouter);
app.use("/api/recipe", recipesRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Node API running: http://localhost:${PORT}`);
});
