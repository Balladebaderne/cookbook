import { db } from "./db.js";

export function initDb() {
  // Tables
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      time_minutes INTEGER NOT NULL,
      price TEXT NOT NULL,
      link TEXT,
      description TEXT,
      image TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      recipe_id INTEGER,
      ingredient_id INTEGER,
      amount TEXT,
      unit TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS recipe_tags (
      recipe_id INTEGER,
      tag_id INTEGER,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id),
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    )
  `).run();

  // Seed only if no recipes
  const row = db.prepare(`SELECT COUNT(*) AS c FROM recipes`).get();
  if (row.c === 0) seedDb();
}

function seedDb() {
  const insertIngredient = db.prepare(`INSERT INTO ingredients (name) VALUES (?)`);
  const insertTag = db.prepare(`INSERT INTO tags (name) VALUES (?)`);

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (title, time_minutes, price, link, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertRecipeIngredient = db.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
    VALUES (?, ?, ?, ?)
  `);

  const insertRecipeTag = db.prepare(`
    INSERT INTO recipe_tags (recipe_id, tag_id)
    VALUES (?, ?)
  `);

  const trx = db.transaction(() => {
    // Ingredients (samme rækkefølge => samme ids)
    const ingredients = [
      "Spaghetti","Eggs","Pancetta","Parmesan Cheese","Black Pepper","Salt",
      "Chicken Breast","Breadcrumbs","Mozzarella Cheese","Tomato Sauce","Olive Oil",
      "Garlic","Penne Pasta","Bell Peppers","Zucchini","Cherry Tomatoes","Basil",
      "Butter","Flour","Salmon Fillet","Lemon","Dill"
    ];
    ingredients.forEach((x) => insertIngredient.run(x));

    // Tags (samme rækkefølge => samme ids)
    const tags = ["Italian","Quick","Dinner","Vegetarian","Healthy","Seafood"];
    tags.forEach((x) => insertTag.run(x));

    // Recipes
    const r1 = insertRecipe.run(
      "Spaghetti Carbonara", 25, "12.50", "http://example.com/carbonara",
`Step 1: Bring a large pot of salted water to boil and cook 400g spaghetti according to package directions.

Step 2: While pasta cooks, cut 200g pancetta into small cubes and fry in a large pan over medium heat until crispy (about 5 minutes).

Step 3: In a bowl, whisk together 4 large eggs, 100g grated Parmesan cheese, and plenty of black pepper.

Step 4: When pasta is ready, reserve 1 cup of pasta water, then drain the pasta.

Step 5: Remove the pan with pancetta from heat. Add the hot pasta to the pan and toss.

Step 6: Pour the egg mixture over the pasta and toss quickly. The heat from the pasta will cook the eggs. Add pasta water bit by bit if needed to create a creamy sauce.

Step 7: Serve immediately with extra Parmesan cheese and black pepper.`
    );
    const recipe1_id = Number(r1.lastInsertRowid);

    const r2 = insertRecipe.run(
      "Chicken Parmesan", 50, "18.00", "http://example.com/chicken-parm",
`Step 1: Preheat oven to 200C (400F).

Step 2: Place 2 chicken breasts between plastic wrap and pound to 2cm thickness.

Step 3: Set up breading station: flour in one plate, 2 beaten eggs in another, and 150g breadcrumbs mixed with 50g Parmesan in a third.

Step 4: Season chicken with salt and pepper, then coat in flour, dip in egg, and press into breadcrumb mixture.

Step 5: Heat 3 tablespoons olive oil in a large oven-safe skillet over medium-high heat. Fry chicken until golden brown, about 4 minutes per side.

Step 6: Pour 300ml tomato sauce over the chicken, then top each breast with 100g sliced mozzarella.

Step 7: Transfer skillet to oven and bake for 15-20 minutes until cheese is melted and bubbly.

Step 8: Garnish with fresh basil and serve with pasta or salad.`
    );
    const recipe2_id = Number(r2.lastInsertRowid);

    const r3 = insertRecipe.run(
      "Pasta Primavera", 30, "10.00", "http://example.com/primavera",
`Step 1: Cook 350g penne pasta in salted boiling water according to package directions. Reserve 1 cup pasta water before draining.

Step 2: While pasta cooks, chop 1 red bell pepper, 1 zucchini into bite-sized pieces, and halve 200g cherry tomatoes.

Step 3: Heat 3 tablespoons olive oil in a large pan over medium-high heat. Add 3 minced garlic cloves and cook for 30 seconds.

Step 4: Add bell peppers and zucchini to the pan. Cook for 5-7 minutes until vegetables are tender.

Step 5: Add cherry tomatoes and cook for another 2-3 minutes until they start to soften.

Step 6: Add the drained pasta to the pan with vegetables. Toss everything together, adding pasta water as needed to create a light sauce.

Step 7: Season with salt and black pepper. Remove from heat and stir in fresh basil leaves.

Step 8: Serve hot with grated Parmesan cheese on top.`
    );
    const recipe3_id = Number(r3.lastInsertRowid);

    const r4 = insertRecipe.run(
      "Garlic Butter Salmon", 20, "22.00", "http://example.com/salmon",
`Step 1: Pat 4 salmon fillets (150g each) dry with paper towels and season both sides with salt and pepper.

Step 2: Heat 2 tablespoons olive oil in a large skillet over medium-high heat.

Step 3: Place salmon fillets skin-side up in the pan. Cook for 4-5 minutes until golden brown.

Step 4: Flip the salmon and cook for another 3-4 minutes.

Step 5: Reduce heat to medium and add 3 tablespoons butter, 4 minced garlic cloves, and juice of 1 lemon to the pan.

Step 6: Spoon the garlic butter sauce over the salmon repeatedly for 1-2 minutes.

Step 7: Remove from heat and sprinkle with fresh dill.

Step 8: Serve immediately with the pan sauce, accompanied by rice or vegetables.`
    );
    const recipe4_id = Number(r4.lastInsertRowid);

    // recipe_ingredients
    insertRecipeIngredient.run(recipe1_id, 1, "400", "g");
    insertRecipeIngredient.run(recipe1_id, 2, "4", "large");
    insertRecipeIngredient.run(recipe1_id, 3, "200", "g");
    insertRecipeIngredient.run(recipe1_id, 4, "100", "g");
    insertRecipeIngredient.run(recipe1_id, 5, "1", "tsp");
    insertRecipeIngredient.run(recipe1_id, 6, "1", "tsp");

    insertRecipeIngredient.run(recipe2_id, 7, "2", "pieces");
    insertRecipeIngredient.run(recipe2_id, 8, "150", "g");
    insertRecipeIngredient.run(recipe2_id, 9, "100", "g");
    insertRecipeIngredient.run(recipe2_id, 10, "300", "ml");
    insertRecipeIngredient.run(recipe2_id, 11, "3", "tbsp");
    insertRecipeIngredient.run(recipe2_id, 4, "50", "g");
    insertRecipeIngredient.run(recipe2_id, 6, "1", "tsp");

    insertRecipeIngredient.run(recipe3_id, 13, "350", "g");
    insertRecipeIngredient.run(recipe3_id, 14, "1", "piece");
    insertRecipeIngredient.run(recipe3_id, 15, "1", "piece");
    insertRecipeIngredient.run(recipe3_id, 16, "200", "g");
    insertRecipeIngredient.run(recipe3_id, 11, "3", "tbsp");
    insertRecipeIngredient.run(recipe3_id, 12, "3", "cloves");
    insertRecipeIngredient.run(recipe3_id, 17, "1", "handful");
    insertRecipeIngredient.run(recipe3_id, 6, "1", "tsp");
    insertRecipeIngredient.run(recipe3_id, 5, "1", "tsp");

    insertRecipeIngredient.run(recipe4_id, 20, "4", "fillets");
    insertRecipeIngredient.run(recipe4_id, 11, "2", "tbsp");
    insertRecipeIngredient.run(recipe4_id, 18, "3", "tbsp");
    insertRecipeIngredient.run(recipe4_id, 12, "4", "cloves");
    insertRecipeIngredient.run(recipe4_id, 21, "1", "piece");
    insertRecipeIngredient.run(recipe4_id, 22, "2", "tbsp");

    // recipe_tags
    insertRecipeTag.run(recipe1_id, 1); // Italian
    insertRecipeTag.run(recipe1_id, 2); // Quick

    insertRecipeTag.run(recipe2_id, 1); // Italian
    insertRecipeTag.run(recipe2_id, 3); // Dinner

    insertRecipeTag.run(recipe3_id, 1); // Italian
    insertRecipeTag.run(recipe3_id, 4); // Vegetarian
    insertRecipeTag.run(recipe3_id, 5); // Healthy

    insertRecipeTag.run(recipe4_id, 5); // Healthy
    insertRecipeTag.run(recipe4_id, 6); // Seafood
  });

  trx();
}
