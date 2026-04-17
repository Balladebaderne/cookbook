import { Router } from "express";
import * as recipes from "../services/recipes.js";

const router = Router();

router.get("/recipes/", async (req, res) => {
  try {
    res.status(200).json(await recipes.listRecipes());
  } catch (err) {
    console.error("GET /recipes error:", err);
    res.status(500).json({ error: "Kunne ikke hente opskrifter." });
  }
});

router.post("/recipes/", async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.title?.trim()) {
      return res.status(400).json({ error: "Opskriften skal have et navn." });
    }
    const id = await recipes.createRecipe(data);
    res.status(201).json({ id, ...data });
  } catch (err) {
    console.error("POST /recipes error:", err);
    res.status(500).json({ error: "Kunne ikke oprette opskriften." });
  }
});

router.get("/recipes/country/:country", async (req, res) => {
  try {
    res.status(200).json(await recipes.listRecipesByCountry(req.params.country));
  } catch (err) {
    console.error("GET /recipes/country error:", err);
    res.status(500).json({ error: "Kunne ikke hente opskrifter for dette land." });
  }
});

router.get("/recipes/:id/", async (req, res) => {
  try {
    const recipe = await recipes.getRecipe(Number(req.params.id));
    if (!recipe) return res.status(404).json({ detail: "Not found" });
    res.status(200).json(recipe);
  } catch (err) {
    console.error("GET /recipes/:id error:", err);
    res.status(500).json({ error: "Kunne ikke hente opskriften." });
  }
});

router.put("/recipes/:id/", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = req.body || {};
    if (!data.title?.trim()) {
      return res.status(400).json({ error: "Opskriften skal have et navn." });
    }
    const ok = await recipes.updateRecipe(id, data);
    if (!ok) return res.status(404).json({ detail: "Not found" });
    res.status(200).json({ id, ...data });
  } catch (err) {
    console.error("PUT /recipes/:id error:", err);
    res.status(500).json({ error: "Kunne ikke opdatere opskriften." });
  }
});

router.delete("/recipes/:id/", async (req, res) => {
  try {
    await recipes.deleteRecipe(Number(req.params.id));
    res.status(204).send("");
  } catch (err) {
    console.error("DELETE /recipes/:id error:", err);
    res.status(500).json({ error: "Kunne ikke slette opskriften." });
  }
});

router.get("/ingredients/", async (req, res) => {
  try {
    res.status(200).json(await recipes.listIngredients());
  } catch (err) {
    console.error("GET /ingredients error:", err);
    res.status(500).json({ error: "Kunne ikke hente ingredienser." });
  }
});

router.get("/tags/", async (req, res) => {
  try {
    res.status(200).json(await recipes.listTags());
  } catch (err) {
    console.error("GET /tags error:", err);
    res.status(500).json({ error: "Kunne ikke hente tags." });
  }
});

export default router;
