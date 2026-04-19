import { db } from "../db.js";

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

export async function listRecipes() {
  const recipes = await db.prepare(
    `SELECT id, title, time_minutes, price, link, image FROM recipes`
  ).all();

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

  const ingredientsByRecipe = allIngredients.reduce((acc, i) => {
    (acc[i.recipe_id] ??= []).push({ id: i.id, name: i.name, amount: i.amount, unit: i.unit });
    return acc;
  }, {});

  const tagsByRecipe = allTags.reduce((acc, t) => {
    (acc[t.recipe_id] ??= []).push({ id: t.id, name: t.name });
    return acc;
  }, {});

  return recipes.map(r => ({
    id: r.id,
    title: r.title,
    time_minutes: r.time_minutes,
    price: r.price,
    link: r.link || "",
    image: r.image || null,
    ingredients: ingredientsByRecipe[r.id] || [],
    tags: tagsByRecipe[r.id] || [],
  }));
}

export async function listRecipesByCountry(country) {
  const recipes = await db.prepare(
    `SELECT id, title, time_minutes, price, link, description, image, country FROM recipes WHERE LOWER(country) = ?`
  ).all(country.toLowerCase());

  const ids = recipes.map(r => r.id);
  if (ids.length === 0) return [];

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

  return recipes.map(r => ({
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
}

export async function getRecipe(id) {
  const recipe = await db.prepare(
    `SELECT id, title, time_minutes, price, link, description, instructions, image FROM recipes WHERE id = ?`
  ).get(id);

  if (!recipe) return null;

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

  return {
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
  };
}

export async function createRecipe(data) {
  await db.exec("BEGIN TRANSACTION");
  try {
    const result = await db.prepare(
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

    const recipeId = result.lastInsertRowid;
    await saveIngredients(recipeId, data.ingredients);
    await saveTags(recipeId, data.tags);
    await db.exec("COMMIT");
    return recipeId;
  } catch (err) {
    await db.exec("ROLLBACK").catch(() => {});
    throw err;
  }
}

export async function updateRecipe(id, data) {
  const existing = await db.prepare(`SELECT id FROM recipes WHERE id = ?`).get(id);
  if (!existing) return false;

  await db.exec("BEGIN TRANSACTION");
  try {
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

    await db.prepare(`DELETE FROM recipe_ingredients WHERE recipe_id = ?`).run(id);
    await db.prepare(`DELETE FROM recipe_tags WHERE recipe_id = ?`).run(id);
    await saveIngredients(id, data.ingredients);
    await saveTags(id, data.tags);
    await db.exec("COMMIT");
    return true;
  } catch (err) {
    await db.exec("ROLLBACK").catch(() => {});
    throw err;
  }
}

export async function deleteRecipe(id) {
  await db.prepare(`DELETE FROM recipe_ingredients WHERE recipe_id = ?`).run(id);
  await db.prepare(`DELETE FROM recipe_tags WHERE recipe_id = ?`).run(id);
  await db.prepare(`DELETE FROM recipes WHERE id = ?`).run(id);
}

export async function listIngredients() {
  return db.prepare(`SELECT id, name FROM ingredients`).all();
}

export async function listTags() {
  return db.prepare(`SELECT id, name FROM tags`).all();
}
