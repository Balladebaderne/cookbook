import { Router } from "express";
import * as recipes from "../services/recipes.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../middleware/error.js";

const router = Router();

router.get("/recipes/", asyncHandler(async (req, res) => {
  res.json(await recipes.listRecipes());
}));

router.post("/recipes/", asyncHandler(async (req, res) => {
  const data = req.body || {};
  if (!data.title?.trim()) throw new HttpError(400, "Opskriften skal have et navn.");
  const id = await recipes.createRecipe(data);
  res.status(201).json({ id, ...data });
}));

router.get("/recipes/country/:country", asyncHandler(async (req, res) => {
  res.json(await recipes.listRecipesByCountry(req.params.country));
}));

router.get("/recipes/:id/", asyncHandler(async (req, res) => {
  const recipe = await recipes.getRecipe(Number(req.params.id));
  if (!recipe) throw new HttpError(404, "Opskriften blev ikke fundet.");
  res.json(recipe);
}));

router.put("/recipes/:id/", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body || {};
  if (!data.title?.trim()) throw new HttpError(400, "Opskriften skal have et navn.");
  const ok = await recipes.updateRecipe(id, data);
  if (!ok) throw new HttpError(404, "Opskriften blev ikke fundet.");
  res.json({ id, ...data });
}));

router.delete("/recipes/:id/", asyncHandler(async (req, res) => {
  await recipes.deleteRecipe(Number(req.params.id));
  res.status(204).send("");
}));

router.get("/ingredients/", asyncHandler(async (req, res) => {
  res.json(await recipes.listIngredients());
}));

router.get("/tags/", asyncHandler(async (req, res) => {
  res.json(await recipes.listTags());
}));

export default router;
