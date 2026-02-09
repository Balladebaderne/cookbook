import { Router } from "express";
import { db } from "../db.js";

const router = Router();

/**
 * GET /api/recipe/recipes/
 * Returnerer liste af recipes + ingredients + tags (som Flask)
 */
router.get("/recipes/", (req, res) => {
  console.log("Route invoked: GET /api/recipe/recipes/");

  // query params findes (legacy ignorerer dem reelt)
  const ingredients = req.query.ingredients;
  const tags = req.query.tags;

  const recipes = db.prepare(`
    SELECT id, title, time_minutes, price, link
    FROM recipes
  `).all();

  const ingStmt = db.prepare(`
    SELECT i.id, i.name, ri.amount, ri.unit
    FROM ingredients i
    JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = ?
  `);

  const tagStmt = db.prepare(`
    SELECT t.id, t.name
    FROM tags t
    JOIN recipe_tags rt ON t.id = rt.tag_id
    WHERE rt.recipe_id = ?
  `);

  const result = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    time_minutes: r.time_minutes,
    price: r.price,
    link: r.link || "",
    ingredients: ingStmt.all(r.id).map((ing) => ({
      id: ing.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit
    })),
    tags: tagStmt.all(r.id).map((t) => ({
      id: t.id,
      name: t.name
    }))
  }));

  res.status(200).json(result);
});

/**
 * POST /api/recipe/recipes/
 * Stub som Flask (ingen DB write endnu)
 */
router.post("/recipes/", (req, res) => {
  console.log("Route invoked: POST /api/recipe/recipes/");
  const data = req.body || {};

  res.status(201).json({
    id: 1,
    title: data.title,
    time_minutes: data.time_minutes,
    price: data.price,
    link: data.link || "",
    tags: data.tags || [],
    ingredients: data.ingredients || [],
    description: data.description || ""
  });
});

/**
 * GET /api/recipe/recipes/:id/
 * Returnerer recipe + ingredients + tags (som Flask)
 */
router.get("/recipes/:id/", (req, res) => {
  console.log("Route invoked: GET /api/recipe/recipes/<int:id>/");

  const id = Number(req.params.id);

  const recipe = db.prepare(`
    SELECT id, title, time_minutes, price, link, description
    FROM recipes
    WHERE id = ?
  `).get(id);

  if (!recipe) return res.status(404).json({ detail: "Not found" });

  const recipeIngredients = db.prepare(`
    SELECT i.id, i.name, ri.amount, ri.unit
    FROM ingredients i
    JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = ?
  `).all(id);

  const recipeTags = db.prepare(`
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
    ingredients: recipeIngredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit
    })),
    tags: recipeTags.map((t) => ({
      id: t.id,
      name: t.name
    }))
  });
});

/**
 * PUT/PATCH/DELETE stubs (som legacy)
 */
router.put("/recipes/:id/", (req, res) => {
  console.log("Route invoked: PUT /api/recipe/recipes/<int:id>/");
  const id = Number(req.params.id);
  const data = req.body || {};

  res.status(200).json({
    id,
    title: data.title,
    time_minutes: data.time_minutes,
    price: data.price,
    link: data.link || "",
    tags: data.tags || [],
    ingredients: data.ingredients || [],
    description: data.description || ""
  });
});

router.patch("/recipes/:id/", (req, res) => {
  console.log("Route invoked: PATCH /api/recipe/recipes/<int:id>/");
  const id = Number(req.params.id);
  const data = req.body || {};

  res.status(200).json({
    id,
    title: data.title ?? "Sample Recipe",
    time_minutes: data.time_minutes ?? 30,
    price: data.price ?? "10.00",
    link: data.link || "",
    tags: data.tags || [],
    ingredients: data.ingredients || [],
    description: data.description || ""
  });
});

router.delete("/recipes/:id/", (req, res) => {
  console.log("Route invoked: DELETE /api/recipe/recipes/<int:id>/");
  res.status(204).send("");
});

router.post("/recipes/:id/upload-image/", (req, res) => {
  console.log("Route invoked: POST /api/recipe/recipes/<int:id>/upload-image/");
  const id = Number(req.params.id);

  res.status(200).json({
    id,
    image: "http://example.com/image.jpg"
  });
});

/**
 * Ingredients + Tags: read-only (matches Flask)
 */
router.get("/ingredients/", (req, res) => {
  console.log("Route invoked: GET /api/recipe/ingredients/");
  const assigned_only = req.query.assigned_only;

  const ingredients = db.prepare(`SELECT id, name FROM ingredients`).all();
  res.status(200).json(ingredients.map((i) => ({ id: i.id, name: i.name })));
});

router.get("/tags/", (req, res) => {
  console.log("Route invoked: GET /api/recipe/tags/");
  const assigned_only = req.query.assigned_only;

  const tags = db.prepare(`SELECT id, name FROM tags`).all();
  res.status(200).json(tags.map((t) => ({ id: t.id, name: t.name })));
});

export default router;
