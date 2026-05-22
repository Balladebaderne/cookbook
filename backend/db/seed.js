import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SEED_PATH = path.join(__dirname, "seed.json");

function assertString(value, field, recipeTitle = "seed recipe") {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid seed data: ${recipeTitle} is missing ${field}.`);
  }

  return value.trim();
}

function assertArray(value, field, recipeTitle) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid seed data: ${recipeTitle} must define ${field} as an array.`);
  }

  return value;
}

export async function loadSeedData(seedPath = DEFAULT_SEED_PATH) {
  const raw = await readFile(seedPath, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.recipes) || data.recipes.length === 0) {
    throw new Error("Invalid seed data: recipes must be a non-empty array.");
  }

  return data.recipes;
}

async function findOrCreateByName(conn, table, name) {
  const cleanName = assertString(name, "name", table);
  const existing = await conn.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(cleanName);

  if (existing) {
    return existing.id;
  }

  const created = await conn.prepare(`INSERT INTO ${table} (name) VALUES (?)`).run(cleanName);
  return created.lastInsertRowid;
}

async function insertRecipe(conn, recipe) {
  const title = assertString(recipe.title, "title");
  const instructions = assertArray(recipe.instructions, "instructions", title);
  const ingredients = assertArray(recipe.ingredients, "ingredients", title);
  const tags = assertArray(recipe.tags, "tags", title);

  const created = await conn.prepare(`
    INSERT INTO recipes (title, time_minutes, price, link, description, instructions, image, country)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    Number(recipe.time_minutes || 0),
    String(recipe.price || "0"),
    recipe.link || "",
    recipe.description || "",
    JSON.stringify(instructions),
    recipe.image || null,
    assertString(recipe.country, "country", title).toLowerCase()
  );

  for (const ingredient of ingredients) {
    const ingredientId = await findOrCreateByName(conn, "ingredients", ingredient.name);
    await conn.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
      VALUES (?, ?, ?, ?)
    `).run(
      created.lastInsertRowid,
      ingredientId,
      ingredient.amount || null,
      ingredient.unit || null
    );
  }

  for (const tag of tags) {
    const tagId = await findOrCreateByName(conn, "tags", tag);
    await conn.prepare("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)")
      .run(created.lastInsertRowid, tagId);
  }
}

async function insertSeedData(conn) {
  const recipes = await loadSeedData();

  for (const recipe of recipes) {
    await insertRecipe(conn, recipe);
  }
}

export async function seedDb() {
  try {
    await db.transaction(insertSeedData);
    console.log("Database seeded successfully");
  } catch (err) {
    console.error("Error seeding database:", err);
    throw err;
  }
}
