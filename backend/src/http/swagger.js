import { readdirSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import swaggerUiDist from "swagger-ui-dist";
import { HttpError } from "../middleware/error.js";
import { defineRoute } from "./router.js";
import { sendBuffer, sendHtml } from "./responses.js";

const swaggerUiPath = swaggerUiDist.absolutePath();
const swaggerUiAssets = new Set(readdirSync(swaggerUiPath));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function swaggerHtml(spec) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cookbook API docs</title>
    <link rel="stylesheet" href="/apidocs/swagger-ui.css" />
    <link rel="icon" type="image/png" href="/apidocs/favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="/apidocs/favicon-16x16.png" sizes="16x16" />
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *::before, *::after { box-sizing: inherit; }
      body { margin: 0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/apidocs/swagger-ui-bundle.js"></script>
    <script src="/apidocs/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(spec)},
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "BaseLayout"
      });
    </script>
  </body>
</html>`;
}

async function serveSwaggerAsset(res, assetName) {
  const safeName = path.basename(assetName);
  if (safeName !== assetName || !swaggerUiAssets.has(safeName)) {
    throw new HttpError(404, "Ikke fundet.");
  }

  const extension = path.extname(safeName);
  const contentType = mimeTypes[extension] || "application/octet-stream";
  const buffer = await readFile(path.join(swaggerUiPath, safeName));
  sendBuffer(res, 200, contentType, buffer);
}

export function createSwaggerRoutes(spec) {
  const html = swaggerHtml(spec);

  return [
    defineRoute("GET", "/apidocs", async ({ res }) => {
      sendHtml(res, 200, html);
    }),
    defineRoute("GET", "/apidocs/*", async ({ res, params }) => {
      await serveSwaggerAsset(res, params.wildcard);
    }),
  ];
}
