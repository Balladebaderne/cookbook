import http from "http";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./db/schema.js";

import apiRoutes from "./routes/api.js";
import recipeRoutes from "./routes/recipes.js";
import { createRouter, defineRoute } from "./http/router.js";
import { sendJson } from "./http/responses.js";
import { createSwaggerRoutes } from "./http/swagger.js";
import { errorHandler, notFound } from "./middleware/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
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

export function createApp() {
  return createRouter(createRoutes(), {
    onError: errorHandler,
    onNotFound: notFound,
  });
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
