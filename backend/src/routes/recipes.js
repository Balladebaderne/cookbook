import * as recipes from "../services/recipes.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { sendJson, sendNoContent } from "../http/responses.js";
import { defineRoute } from "../http/router.js";

export default [
  defineRoute("GET", "/api/recipes", async ({ res }) => {
    sendJson(res, 200, await recipes.listRecipes());
  }),

  defineRoute("POST", "/api/recipes", requireAuth(async ({ res, body }) => {
    const data = body || {};
    if (!data.title?.trim()) throw new HttpError(400, "Opskriften skal have et navn.");

    const id = await recipes.createRecipe(data);
    sendJson(res, 201, { id, ...data });
  })),

  defineRoute("GET", "/api/recipes/country/:country", async ({ res, params }) => {
    sendJson(res, 200, await recipes.listRecipesByCountry(params.country));
  }),

  defineRoute("GET", "/api/recipes/:id", async ({ res, params }) => {
    const recipe = await recipes.getRecipe(Number(params.id));
    if (!recipe) throw new HttpError(404, "Opskriften blev ikke fundet.");

    sendJson(res, 200, recipe);
  }),

  defineRoute("PUT", "/api/recipes/:id", requireAuth(async ({ res, params, body }) => {
    const id = Number(params.id);
    const data = body || {};
    if (!data.title?.trim()) throw new HttpError(400, "Opskriften skal have et navn.");

    const ok = await recipes.updateRecipe(id, data);
    if (!ok) throw new HttpError(404, "Opskriften blev ikke fundet.");

    sendJson(res, 200, { id, ...data });
  })),

  defineRoute("DELETE", "/api/recipes/:id", requireAuth(async ({ res, params }) => {
    await recipes.deleteRecipe(Number(params.id));
    sendNoContent(res);
  })),

  defineRoute("GET", "/api/ingredients", async ({ res }) => {
    sendJson(res, 200, await recipes.listIngredients());
  }),

  defineRoute("GET", "/api/tags", async ({ res }) => {
    sendJson(res, 200, await recipes.listTags());
  }),
];
