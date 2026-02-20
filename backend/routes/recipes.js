import { Router } from "express";
import { db } from "../db.js";

const router = Router();

// ── GET alle opskrifter ──────────────────────────────────
router.get("/recipes/", async (req, res) => {
  try {
    const recipes = await db.prepare(`SELECT id, title, time_minutes, price, link FROM recipes`).all();

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

    const result = await Promise.all(recipes.map(async r => ({
      id: r.id,
      title: r.title,
      time_minutes: r.time_minutes,
      price: r.price,
      link: r.link || "",
      ingredients: await ingStmt.all(r.id).then(ings => ings.map(i => ({ id: i.id, name: i.name, amount: i.amount, unit: i.unit }))),
      tags: await tagStmt.all(r.id).then(ts => ts.map(t => ({ id: t.id, name: t.name })))
    })));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST opret opskrift ──────────────────────────────────
router.post("/recipes/", async (req, res) => {
  try {
    const data = req.body || {};

    const recipe = await db.prepare(
      `INSERT INTO recipes (title, time_minutes, price, link, description) VALUES (?, ?, ?, ?, ?)`
    ).run(
      data.title,
      data.time_minutes || 0,
      data.price || "0",
      data.link || "",
      data.description || ""
    );

    const recipeId = recipe.lastInsertRowid;

    // Ingredienser
    if (data.ingredients?.length) {
      for (const ing of data.ingredients) {
        if (!ing.name?.trim()) continue;
        let ingredient = await db.prepare(`SELECT id FROM ingredients WHERE name = ?`).get(ing.name);
        if (!ingredient) {
          ingredient = { id: (await db.prepare(`INSERT INTO ingredients (name) VALUES (?)`).run(ing.name)).lastInsertRowid };
        }
        await db.prepare(`INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)`)
          .run(recipeId, ingredient.id, ing.amount || null, ing.unit || null);
      }
    }

    // Tags
    if (data.tags?.length) {
      for (const t of data.tags) {
        if (!t.name?.trim()) continue;
        let tag = await db.prepare(`SELECT id FROM tags WHERE name = ?`).get(t.name);
        if (!tag) {
          tag = { id: (await db.prepare(`INSERT INTO tags (name) VALUES (?)`).run(t.name)).lastInsertRowid };
        }
        await db.prepare(`INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)`).run(recipeId, tag.id);
      }
    }

    res.status(201).json({ id: recipeId, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET enkelt opskrift ──────────────────────────────────
router.get("/recipes/:id/", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const recipe = await db.prepare(`SELECT id, title, time_minutes, price, link, description FROM recipes WHERE id = ?`).get(id);
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
      ingredients: ingredients.map(i => ({ id: i.id, name: i.name, amount: i.amount, unit: i.unit })),
      tags: tags.map(t => ({ id: t.id, name: t.name }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT opdater opskrift ─────────────────────────────────
router.put("/recipes/:id/", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = req.body || {};

    const existing = await db.prepare(`SELECT id FROM recipes WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ detail: "Not found" });

    await db.prepare(
      `UPDATE recipes SET title = ?, time_minutes = ?, price = ?, link = ?, description = ? WHERE id = ?`
    ).run(
      data.title,
      data.time_minutes || 0,
      data.price || "0",
      data.link || "",
      data.description || "",
      id
    );

    // Slet gamle ingredienser og tags, indsæt nye
    await db.prepare(`DELETE FROM recipe_ingredients WHERE recipe_id = ?`).run(id);
    await db.prepare(`DELETE FROM recipe_tags WHERE recipe_id = ?`).run(id);

    if (data.ingredients?.length) {
      for (const ing of data.ingredients) {
        if (!ing.name?.trim()) continue;
        let ingredient = await db.prepare(`SELECT id FROM ingredients WHERE name = ?`).get(ing.name);
        if (!ingredient) {
          ingredient = { id: (await db.prepare(`INSERT INTO ingredients (name) VALUES (?)`).run(ing.name)).lastInsertRowid };
        }
        await db.prepare(`INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)`)
          .run(id, ingredient.id, ing.amount || null, ing.unit || null);
      }
    }

    if (data.tags?.length) {
      for (const t of data.tags) {
        if (!t.name?.trim()) continue;
        let tag = await db.prepare(`SELECT id FROM tags WHERE name = ?`).get(t.name);
        if (!tag) {
          tag = { id: (await db.prepare(`INSERT INTO tags (name) VALUES (?)`).run(t.name)).lastInsertRowid };
        }
        await db.prepare(`INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)`).run(id, tag.id);
      }
    }

    res.status(200).json({ id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// ── Ingredients + Tags (read-only) ───────────────────────
router.get("/ingredients/", async (req, res) => {
  try {
    const ingredients = await db.prepare(`SELECT id, name FROM ingredients`).all();
    res.status(200).json(ingredients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tags/", async (req, res) => {
  try {
    const tags = await db.prepare(`SELECT id, name FROM tags`).all();
    res.status(200).json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/recipes/:id/upload-image/", (req, res) => {
  const id = Number(req.params.id);
  res.status(200).json({ id, image: "http://example.com/image.jpg" });
});

export default router;