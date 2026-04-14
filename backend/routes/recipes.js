import { Router } from "express";
import { db } from "../db.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────

async function upsertIngredient(name) {
  let row = await db.prepare(`SELECT id FROM ingredients WHERE name = ?`).get(name);
  if (!row) {
    row = { id: (await db.prepare(`INSERT INTO ingredients (name) VALUES (?)`).run(name)).lastInsertRowid };
  }
  return row.id;
}

async function upsertTag(name) {
  let row = await db.prepare(`SELECT id FROM tags WHERE name = ?`).get(name);
  if (!row) {
    row = { id: (await db.prepare(`INSERT INTO tags (name) VALUES (?)`).run(name)).lastInsertRowid };
  }
  return row.id;
}

async function saveIngredients(recipeId, ingredients = []) {
  for (const ing of ingredients) {
    if (!ing.name?.trim()) continue;
    const ingredientId = await upsertIngredient(ing.name);
    await db.prepare(`INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)`)
      .run(recipeId, ingredientId, ing.amount || null, ing.unit || null);
  }
}

async function saveTags(recipeId, tags = []) {
  for (const t of tags) {
    if (!t.name?.trim()) continue;
    const tagId = await upsertTag(t.name);
    await db.prepare(`INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)`).run(recipeId, tagId);
  }
}

// ── GET alle opskrifter ──────────────────────────────────
router.get("/recipes/", async (req, res) => {
  try {
    const recipes = await db.prepare(
      `SELECT id, title, time_minutes, price, link, image FROM recipes`
    ).all();

    // Fetch all ingredients and tags in 2 queries instead of 2×N
    const allIngredients = await db.prepare(`
      SELECT ri.recipe_id, i.id, i.name, ri.amount, ri.unit
      FROM ingredients i
      JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
    `).all();

    const allTags = await db.prepare(`
      SELECT rt.recipe_id, t.id, t.name
      FROM tags t
      JOIN recipe_tags rt ON t.id = rt.tag_id
    `).all();

    // Group by recipe_id for O(1) lookup
    const ingredientsByRecipe = allIngredients.reduce((acc, i) => {
      (acc[i.recipe_id] ??= []).push({ id: i.id, name: i.name, amount: i.amount, unit: i.unit });
      return acc;
    }, {});

    const tagsByRecipe = allTags.reduce((acc, t) => {
      (acc[t.recipe_id] ??= []).push({ id: t.id, name: t.name });
      return acc;
    }, {});

    const result = recipes.map(r => ({
      id: r.id,
      title: r.title,
      time_minutes: r.time_minutes,
      price: r.price,
      link: r.link || "",
      image: r.image || null,
      ingredients: ingredientsByRecipe[r.id] || [],
      tags: tagsByRecipe[r.id] || [],
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("GET /recipes error:", err);
    res.status(500).json({ error: "Kunne ikke hente opskrifter." });
  }
});

// ── POST opret opskrift ──────────────────────────────────
router.post("/recipes/", async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.title?.trim()) {
      return res.status(400).json({ error: "Opskriften skal have et navn." });
    }

    const recipe = await db.prepare(
      `INSERT INTO recipes (title, time_minutes, price, link, description, instructions, image, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.title.trim(),
      data.time_minutes || 0,
      data.price || "0",
      data.link || "",
      data.description || "",
      data.instructions?.length ? JSON.stringify(data.instructions) : null,
      data.image || null,
      data.country || null
    );

    const recipeId = recipe.lastInsertRowid;

    await saveIngredients(recipeId, data.ingredients);
    await saveTags(recipeId, data.tags);

    res.status(201).json({ id: recipeId, ...data });
  } catch (err) {
    console.error("POST /recipes error:", err);
    res.status(500).json({ error: "Kunne ikke oprette opskriften." });
  }
});

// ── GET opskrifter efter land ────────────────────────────
router.get("/recipes/country/:country", async (req, res) => {
  try {
    const country = req.params.country.toLowerCase();
    const recipes = await db.prepare(
      `SELECT id, title, time_minutes, price, link, description, image, country FROM recipes WHERE LOWER(country) = ?`
    ).all(country);

    const ids = recipes.map(r => r.id);
    if (ids.length === 0) return res.status(200).json([]);

    const placeholders = ids.map(() => "?").join(",");
    const allTags = await db.prepare(`
      SELECT rt.recipe_id, t.id, t.name
      FROM tags t
      JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE rt.recipe_id IN (${placeholders})
    `).all(...ids);

    const tagsByRecipe = allTags.reduce((acc, t) => {
      (acc[t.recipe_id] ??= []).push({ id: t.id, name: t.name });
      return acc;
    }, {});

    const result = recipes.map(r => ({
      id: r.id,
      title: r.title,
      time_minutes: r.time_minutes,
      price: r.price,
      link: r.link || "",
      description: r.description || "",
      image: r.image || null,
      country: r.country,
      tags: tagsByRecipe[r.id] || [],
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("GET /recipes/country error:", err);
    res.status(500).json({ error: "Kunne ikke hente opskrifter for dette land." });
  }
});

// ── GET enkelt opskrift ──────────────────────────────────
router.get("/recipes/:id/", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const recipe = await db.prepare(
      `SELECT id, title, time_minutes, price, link, description, instructions, image FROM recipes WHERE id = ?`
    ).get(id);

    if (!recipe) return res.status(404).json({ detail: "Not found" });

    const ingredients = await db.prepare(`
      SELECT i.id, i.name, ri.amount, ri.unit
      FROM ingredients i
      JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = ?
    `).all(id);

    const tags = await db.prepare(`
      SELECT t.id, t.name
      FROM tags t
      JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE rt.recipe_id = ?
    `).all(id);

    res.status(200).json({
      id: recipe.id,
      title: recipe.title,
      time_minutes: recipe.time_minutes,
      price: recipe.price,
      link: recipe.link || "",
      description: recipe.description || "",
      instructions: recipe.instructions ? JSON.parse(recipe.instructions) : [],
      image: recipe.image || null,
      ingredients: ingredients.map(i => ({ id: i.id, name: i.name, amount: i.amount, unit: i.unit })),
      tags: tags.map(t => ({ id: t.id, name: t.name })),
    });
  } catch (err) {
    console.error("GET /recipes/:id error:", err);
    res.status(500).json({ error: "Kunne ikke hente opskriften." });
  }
});

// ── PUT opdater opskrift ─────────────────────────────────
router.put("/recipes/:id/", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = req.body || {};

    if (!data.title?.trim()) {
      return res.status(400).json({ error: "Opskriften skal have et navn." });
    }

    const existing = await db.prepare(`SELECT id FROM recipes WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ detail: "Not found" });

    await db.prepare(
      `UPDATE recipes SET title = ?, time_minutes = ?, price = ?, link = ?, description = ?, instructions = ?, image = ?, country = ? WHERE id = ?`
    ).run(
      data.title.trim(),
      data.time_minutes || 0,
      data.price || "0",
      data.link || "",
      data.description || "",
      data.instructions?.length ? JSON.stringify(data.instructions) : null,
      data.image || null,
      data.country || null,
      id
    );

    // Replace ingredients and tags
    await db.prepare(`DELETE FROM recipe_ingredients WHERE recipe_id = ?`).run(id);
    await db.prepare(`DELETE FROM recipe_tags WHERE recipe_id = ?`).run(id);

    await saveIngredients(id, data.ingredients);
    await saveTags(id, data.tags);

    res.status(200).json({ id, ...data });
  } catch (err) {
    console.error("PUT /recipes/:id error:", err);
    res.status(500).json({ error: "Kunne ikke opdatere opskriften." });
  }
});

// ── DELETE slet opskrift ─────────────────────────────────
router.delete("/recipes/:id/", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.prepare(`DELETE FROM recipe_ingredients WHERE recipe_id = ?`).run(id);
    await db.prepare(`DELETE FROM recipe_tags WHERE recipe_id = ?`).run(id);
    await db.prepare(`DELETE FROM recipes WHERE id = ?`).run(id);
    res.status(204).send("");
  } catch (err) {
    console.error("DELETE /recipes/:id error:", err);
    res.status(500).json({ error: "Kunne ikke slette opskriften." });
  }
});

// ── Ingredients + Tags (read-only) ───────────────────────
router.get("/ingredients/", async (req, res) => {
  try {
    const ingredients = await db.prepare(`SELECT id, name FROM ingredients`).all();
    res.status(200).json(ingredients);
  } catch (err) {
    console.error("GET /ingredients error:", err);
    res.status(500).json({ error: "Kunne ikke hente ingredienser." });
  }
});

router.get("/tags/", async (req, res) => {
  try {
    const tags = await db.prepare(`SELECT id, name FROM tags`).all();
    res.status(200).json(tags);
  } catch (err) {
    console.error("GET /tags error:", err);
    res.status(500).json({ error: "Kunne ikke hente tags." });
  }
});

export default router;