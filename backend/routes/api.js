import { defineRoute } from "../http/router.js";
import { sendJson } from "../http/responses.js";

export default [
  defineRoute("GET", "/api", async ({ res }) => {
    console.log("Route invoked: GET /api");
    sendJson(res, 200, {
      message: "Cookbook API",
      version: "1.0.0",
      endpoints: {
        recipe: "/api/recipe",
      },
    });
  }),
];
