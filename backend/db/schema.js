import { db } from "./index.js";
import { seedDb } from "./seed.js";

export async function initDb() {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        time_minutes INTEGER NOT NULL,
        price TEXT NOT NULL,
        link TEXT,
        description TEXT,
        instructions TEXT,
        image TEXT,
        country TEXT
      )
    `);

    // Add country column to existing databases that were created before this column existed
    try {
      await db.exec(`ALTER TABLE recipes ADD COLUMN country TEXT`);
    } catch (_) { /* column already exists */ }

    // Backfill country for recipes that were seeded before the column existed
    await db.exec(`UPDATE recipes SET country = 'italy'   WHERE title = 'Spaghetti Carbonara' AND country IS NULL`);
    await db.exec(`UPDATE recipes SET country = 'denmark'  WHERE title LIKE 'Smørbraiseret%'    AND country IS NULL`);
    await db.exec(`UPDATE recipes SET country = 'denmark'  WHERE title LIKE 'Rustikt%'          AND country IS NULL`);
    await db.exec(`UPDATE recipes SET country = 'france'   WHERE title LIKE 'Pandestegte%'      AND country IS NULL`);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        recipe_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        amount TEXT,
        unit TEXT,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id),
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS recipe_tags (
        recipe_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id),
        FOREIGN KEY (tag_id) REFERENCES tags(id)
      )
    `);

    // Indexes for faster JOIN lookups on junction tables
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ri_recipe ON recipe_ingredients(recipe_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_rt_recipe ON recipe_tags(recipe_id)`);

    // Seed if empty
    const result = await db.prepare("SELECT COUNT(*) as c FROM recipes").all();
    const count = result[0]?.c || 0;

    if (count === 0) {
      await seedDb();
    }
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}
