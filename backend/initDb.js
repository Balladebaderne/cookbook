import { db } from "./db.js";

export async function initDb() {
  try {
    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        time_minutes INTEGER NOT NULL,
        price TEXT NOT NULL,
        link TEXT,
        description TEXT,
        instructions TEXT,
        image TEXT
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        recipe_id INTEGER,
        ingredient_id INTEGER,
        amount TEXT,
        unit TEXT,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id),
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS recipe_tags (
        recipe_id INTEGER,
        tag_id INTEGER,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id),
        FOREIGN KEY (tag_id) REFERENCES tags(id)
      )
    `);

    // Check if we need to seed
    const result = await db.prepare("SELECT COUNT(*) as c FROM recipes").all();
    const count = result[0]?.c || 0;
    
    if (count === 0) {
      await seedDb();
    }
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

async function seedDb() {
  try {
    const insertIngredient = db.prepare("INSERT INTO ingredients (name) VALUES (?)");
    const insertTag = db.prepare("INSERT INTO tags (name) VALUES (?)");
    const insertRecipe = db.prepare("INSERT INTO recipes (title, time_minutes, price, link, description, instructions) VALUES (?, ?, ?, ?, ?, ?)");
    const insertRecipeIngredient = db.prepare("INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)");
    const insertRecipeTag = db.prepare("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)");

    await db.exec("BEGIN TRANSACTION");

    // Ingredients
    const ingredients = [
      "Spaghetti","Eggs","Pancetta","Parmesan Cheese","Black Pepper","Salt",
      "Chicken Breast","Breadcrumbs","Mozzarella Cheese","Tomato Sauce","Olive Oil",
      "Garlic","Penne Pasta","Bell Peppers","Zucchini","Cherry Tomatoes","Basil",
      "Butter","Flour","Salmon Fillet","Lemon","Dill"
    ];
    for (const ing of ingredients) {
      await insertIngredient.run(ing);
    }

    // Tags
    const tags = ["Italian","Quick","Dinner","Vegetarian","Healthy","Seafood"];
    for (const tag of tags) {
      await insertTag.run(tag);
    }

    // Recipes  
    const r1 = await insertRecipe.run(
      "Spaghetti Carbonara", 25, "12.50", "http://example.com/carbonara",
      "",
      JSON.stringify([
        "Bring a large pot of salted water to boil and cook 400g spaghetti.",
        "Cook pancetta.",
        "Mix eggs and cheese.",
        "Combine and serve."
      ])
    );

    const r2 = await insertRecipe.run(
      "Chicken Parmesan", 50, "18.00", "http://example.com/chicken-parm",
      "",
      JSON.stringify([
        "Prepare chicken.",
        "Bread and fry.",
        "Add sauce and cheese.",
        "Bake."
      ])
    );

    const r3 = await insertRecipe.run(
      "Pasta Primavera", 30, "10.00", "http://example.com/primavera",
      "",
      JSON.stringify([
        "Cook pasta.",
        "Prepare vegetables.",
        "Combine all ingredients."
      ])
    );

    const r4 = await insertRecipe.run(
      "Garlic Butter Salmon", 20, "22.00", "http://example.com/salmon",
      "",
      JSON.stringify([
        "Season salmon.",
        "Cook in skillet.",
        "Add garlic butter sauce."
      ])
    );

    // Recipe ingredients (sample)
    await insertRecipeIngredient.run(r1.lastID, 1, "400", "g");
    await insertRecipeIngredient.run(r1.lastID, 2, "4", "large");

    // Recipe tags (sample)
    await insertRecipeTag.run(r1.lastID, 1); // Italian

    await db.exec("COMMIT");
    console.log("Database seeded successfully");
  } catch (err) {
    console.error("Error seeding database:", err);
    await db.exec("ROLLBACK").catch(() => {});
  }
}