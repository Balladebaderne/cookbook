import { defineRoute } from "../http/router.js";
import { sendJson } from "../http/responses.js";

export default [
  defineRoute("GET", "/api", async ({ res }) => {
    sendJson(res, 200, {
      message: "Cookbook API",
      version: "1.0.0",
      endpoints: {
        recipes: "/api/recipes",
        ingredients: "/api/ingredients",
        tags: "/api/tags",
      },
    });
  }),
];
