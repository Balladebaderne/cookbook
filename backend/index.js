import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./initDb.js";

import apiRouter from "./routes/api.js";
import usersRouter from "./routes/users.js";
import recipesRouter from "./routes/recipes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI spec
const swaggerDocument = YAML.load(path.join(__dirname, "..", "openapi.yaml"));

await initDb();

app.use(cors());
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString() 
  });
});

// samme base paths som Flask
app.use("/api", apiRouter);
app.use("/api/user", usersRouter);
app.use("/api/recipe", recipesRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Node API running: http://localhost:${PORT}`);
});
