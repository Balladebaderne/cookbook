import { db } from "../db/index.js";
import { findOrCreateByName, groupBy } from "../db/queries.js";

const INGREDIENTS_JOIN = `
  SELECT ri.recipe_id, i.id, i.name, ri.amount, ri.unit
  FROM ingredients i
  JOIN recipe_ingredients ri ON i.id = ri.ingredient_id`;

const TAGS_JOIN = `
  SELECT rt.recipe_id, t.id, t.name
  FROM tags t
  JOIN recipe_tags rt ON t.id = rt.tag_id`;

const toIngredient = (i) => ({ id: i.id, name: i.name, amount: i.amount, unit: i.unit });
const toTag = (t) => ({ id: t.id, name: t.name });

async function saveIngredients(recipeId, ingredients = [], conn = db) {
  for (const ing of ingredients) {
    if (!ing.name?.trim()) continue;
    const ingredientId = await findOrCreateByName(conn, "ingredients", ing.name);
    await conn.prepare("INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)")
      .run(recipeId, ingredientId, ing.amount || null, ing.unit || null);
  }
}

async function saveTags(recipeId, tags = [], conn = db) {
  for (const t of tags) {
    if (!t.name?.trim()) continue;
    const tagId = await findOrCreateByName(conn, "tags", t.name);
    await conn.prepare("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)").run(recipeId, tagId);
  }
}

export async function listRecipes() {
  const recipes = await db.prepare(
    "SELECT id, title, time_minutes, price, link, image FROM recipes"
  ).all();

  const ingredientsByRecipe = groupBy(await db.prepare(INGREDIENTS_JOIN).all(), "recipe_id");
  const tagsByRecipe = groupBy(await db.prepare(TAGS_JOIN).all(), "recipe_id");

  return recipes.map(r => ({
    id: r.id,
    title: r.title,
    time_minutes: r.time_minutes,
    price: r.price,
    link: r.link || "",
    image: r.image || null,
    ingredients: (ingredientsByRecipe[r.id] || []).map(toIngredient),
    tags: (tagsByRecipe[r.id] || []).map(toTag),
  }));
}

export async function listRecipesByCountry(country) {
  const recipes = await db.prepare(
    "SELECT id, title, time_minutes, price, link, description, image, country FROM recipes WHERE LOWER(country) = ?"
  ).all(country.toLowerCase());

  const ids = recipes.map(r => r.id);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const tagsByRecipe = groupBy(
    await db.prepare(`${TAGS_JOIN} WHERE rt.recipe_id IN (${placeholders})`).all(...ids),
    "recipe_id"
  );

  return recipes.map(r => ({
    id: r.id,
    title: r.title,
    time_minutes: r.time_minutes,
    price: r.price,
    link: r.link || "",
    description: r.description || "",
    image: r.image || null,
    country: r.country,
    tags: (tagsByRecipe[r.id] || []).map(toTag),
  }));
}

export async function getRecipe(id) {
  const recipe = await db.prepare(
    "SELECT id, title, time_minutes, price, link, description, instructions, image FROM recipes WHERE id = ?"
  ).get(id);

  if (!recipe) return null;

  const ingredients = await db.prepare(`${INGREDIENTS_JOIN} WHERE ri.recipe_id = ?`).all(id);
  const tags = await db.prepare(`${TAGS_JOIN} WHERE rt.recipe_id = ?`).all(id);

  return {
    id: recipe.id,
    title: recipe.title,
    time_minutes: recipe.time_minutes,
    price: recipe.price,
    link: recipe.link || "",
    description: recipe.description || "",
    instructions: recipe.instructions ? JSON.parse(recipe.instructions) : [],
    image: recipe.image || null,
    ingredients: ingredients.map(toIngredient),
    tags: tags.map(toTag),
  };
}

export async function createRecipe(data) {
  return db.transaction(async (tx) => {
    const result = await tx.prepare(
      "INSERT INTO recipes (title, time_minutes, price, link, description, instructions, image, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
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
    await saveIngredients(recipeId, data.ingredients, tx);
    await saveTags(recipeId, data.tags, tx);
    return recipeId;
  });
}

export async function updateRecipe(id, data) {
  return db.transaction(async (tx) => {
    const existing = await tx.prepare("SELECT id FROM recipes WHERE id = ?").get(id);
    if (!existing) return false;

    await tx.prepare(
      "UPDATE recipes SET title = ?, time_minutes = ?, price = ?, link = ?, description = ?, instructions = ?, image = ?, country = ? WHERE id = ?"
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

    await tx.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = ?").run(id);
    await tx.prepare("DELETE FROM recipe_tags WHERE recipe_id = ?").run(id);
    await saveIngredients(id, data.ingredients, tx);
    await saveTags(id, data.tags, tx);
    return true;
  });
}

export async function deleteRecipe(id) {
  await db.transaction(async (tx) => {
    await tx.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = ?").run(id);
    await tx.prepare("DELETE FROM recipe_tags WHERE recipe_id = ?").run(id);
    await tx.prepare("DELETE FROM recipes WHERE id = ?").run(id);
  });
}

export async function listIngredients() {
  return db.prepare("SELECT id, name FROM ingredients").all();
}

export async function listTags() {
  return db.prepare("SELECT id, name FROM tags").all();
}
