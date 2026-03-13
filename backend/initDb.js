import { db } from "./db.js";

export async function initDb() {
  try {
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

async function seedDb() {
  try {
    const insertIngredient = db.prepare("INSERT INTO ingredients (name) VALUES (?)");
    const insertTag = db.prepare("INSERT INTO tags (name) VALUES (?)");
    const insertRecipe = db.prepare("INSERT INTO recipes (title, time_minutes, price, link, description, instructions) VALUES (?, ?, ?, ?, ?, ?)");
    const insertRecipeIngredient = db.prepare("INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)");
    const insertRecipeTag = db.prepare("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)");

    await db.exec("BEGIN TRANSACTION");

    // Ingredients
    // Carbonara (1-7)
    await insertIngredient.run("Spaghetti");           // 1
    await insertIngredient.run("Guanciale");           // 2
    await insertIngredient.run("Æg");                  // 3
    await insertIngredient.run("Æggeblommer");         // 4
    await insertIngredient.run("Pecorino Romano");     // 5
    await insertIngredient.run("Parmigiano Reggiano"); // 6
    await insertIngredient.run("Sort peber");          // 7
    // Lammeskank (8-15)
    await insertIngredient.run("Lammeskank");          // 8
    await insertIngredient.run("Rødvin");              // 9
    await insertIngredient.run("Hvidløg");             // 10
    await insertIngredient.run("Rosmarin");            // 11
    await insertIngredient.run("Timian");              // 12
    await insertIngredient.run("Løg");                 // 13
    await insertIngredient.run("Gulerod");             // 14
    await insertIngredient.run("Tomatpuré");           // 15
    // Surdejsbrød (16-22)
    await insertIngredient.run("Hvedemel");            // 16
    await insertIngredient.run("Rugmel");              // 17
    await insertIngredient.run("Gær");                 // 18
    await insertIngredient.run("Salt");                // 19
    await insertIngredient.run("Vand");                // 20
    await insertIngredient.run("Surdej");              // 21
    await insertIngredient.run("Olivenolie");          // 22
    // Torsk beurre blanc (23-28)
    await insertIngredient.run("Torsk");               // 23
    await insertIngredient.run("Hvidvin");             // 24
    await insertIngredient.run("Skalotteløg");         // 25
    await insertIngredient.run("Smør");                // 26
    await insertIngredient.run("Fløde");               // 27
    await insertIngredient.run("Citronsaft");          // 28

    // Tags
    await insertTag.run("Italiensk");           // 1
    await insertTag.run("Klassiker");           // 2
    await insertTag.run("Aftensmad");           // 3
    await insertTag.run("Langsom madlavning");  // 4
    await insertTag.run("Fisk");               // 5
    await insertTag.run("Bagning");             // 6
    await insertTag.run("Weekendprojekt");      // 7

    // ── Opskrift 1: Spaghetti Carbonara ──
    const r1 = await insertRecipe.run(
      "Spaghetti Carbonara", 30, "38.00",
      "https://www.seriouseats.com/the-best-spaghetti-alla-carbonara-recipe",
      "Den ægte romerske carbonara — ingen fløde, ingen kompromiser. Hemmeligheden er guanciale og tålmodighed med æggesaucen, så den creamer smukt uden at koagulere.",
      JSON.stringify([
        "Kog spaghetti i rigeligt kraftigt saltet vand til al dente — gem 200 ml pastavand inden du hælder ud.",
        "Skær guanciale i tykke strimler og steg ved middelhøj varme i en tør pande til det er gyldent og sprødt. Sluk for varmen og lad panden køle let af.",
        "Pisk æg, æggeblommer, fintrevet Pecorino Romano og Parmigiano Reggiano sammen i en skål. Krydr gavmildt med friskkværnet sort peber.",
        "Vend den varme pasta direkte op i panden med guanciale (stadig væk fra varmen). Tilsæt æggeblandingen og rør hurtigt mens du gradvist tilsætter pastavand lidt ad gangen — saucen skal være silkeblød og cremet, ikke scrambled eggs.",
        "Server straks på forvarmede tallerkener med ekstra Pecorino og en drys groft sort peber."
      ])
    );
    await insertRecipeIngredient.run(r1.lastID, 1, "400", "g");
    await insertRecipeIngredient.run(r1.lastID, 2, "150", "g");
    await insertRecipeIngredient.run(r1.lastID, 3, "2", "stk");
    await insertRecipeIngredient.run(r1.lastID, 4, "4", "stk");
    await insertRecipeIngredient.run(r1.lastID, 5, "60", "g");
    await insertRecipeIngredient.run(r1.lastID, 6, "40", "g");
    await insertRecipeIngredient.run(r1.lastID, 7, "1", "tsk");
    await insertRecipeTag.run(r1.lastID, 1);
    await insertRecipeTag.run(r1.lastID, 2);

    // ── Opskrift 2: Smørbraiseret lammeskank ──
    const r2 = await insertRecipe.run(
      "Smørbraiseret lammeskank med rødvin", 195, "85.00",
      "https://www.bbcgoodfood.com/recipes/braised-lamb-shanks",
      "En opskrift der belønner tålmodighed. Lammet braiserer langsomt i tre timer til kødet falder af benet og saucen er dyb, rig og næsten sort af koncentreret smag. Perfekt til en kølig lørdag.",
      JSON.stringify([
        "Varm ovnen til 160°C. Krydr lammeskankene generøst med salt og peber på alle sider.",
        "Brun skankene i olivenolie i en tung gryde ved høj varme — 3-4 minutter per side til de har en dyb, karamelliseret stegeskorpe. Tag dem op og sæt til side.",
        "Skru ned til medium og svits groft hakkede løg, gulerødder og hele hvidløgsfed i samme gryde i 8 minutter til bløde. Rør tomatpuré i og lad det stege 2 minutter.",
        "Tilsæt rosmarin, timian og rødvin. Skrab bunden ren for alle de sprøde stegebiter — det er smag. Lad vinen koge ind til det halve.",
        "Læg skankene tilbage, dæk med låg og sæt i ovnen i 2½-3 timer. Vend dem en gang undervejs. Kødet er klar når det falder af benet af sig selv.",
        "Tag skankene op og kog saucen ind på komfuret til den er tyk og skinnende. Smag til med salt. Server med kartoffelmos eller polenta."
      ])
    );
    await insertRecipeIngredient.run(r2.lastID, 8, "4", "stk");
    await insertRecipeIngredient.run(r2.lastID, 9, "500", "ml");
    await insertRecipeIngredient.run(r2.lastID, 10, "6", "fed");
    await insertRecipeIngredient.run(r2.lastID, 11, "2", "kviste");
    await insertRecipeIngredient.run(r2.lastID, 12, "4", "kviste");
    await insertRecipeIngredient.run(r2.lastID, 13, "2", "stk");
    await insertRecipeIngredient.run(r2.lastID, 14, "2", "stk");
    await insertRecipeIngredient.run(r2.lastID, 15, "2", "spsk");
    await insertRecipeTag.run(r2.lastID, 4);
    await insertRecipeTag.run(r2.lastID, 3);
    await insertRecipeTag.run(r2.lastID, 7);

    // ── Opskrift 3: Surdejsbrød ──
    const r3 = await insertRecipe.run(
      "Rustikt surdejsbrød", 60, "12.00",
      "https://www.theperfectloaf.com/beginners-sourdough-bread/",
      "Et brød der tager to dage, men kræver kun 20 minutters aktiv tid. Den lange koldhævning udvikler en kompleks, let syrlig smag og en sprød, karamelliseret skorpe. Læg dejen fredag aften — spis friskbagt brød lørdag formiddag.",
      JSON.stringify([
        "Fredag aften: Bland 450g hvedemel, 50g rugmel, 375g lunkent vand og 100g aktiv surdej i en skål. Lad det hvile 30 minutter (autolyse).",
        "Tilsæt 10g salt opløst i 25g vand. Fold dejen 4 gange ved at strække den op og folde den over sig selv. Gentag foldningerne 3-4 gange med 30 minutters interval over 2 timer.",
        "Form dejen forsigtigt til en rund kugle uden at slå luften ud. Læg i en meldrysset hævekurv (eller en skål beklædt med et meldrysset viskestykke). Dæk til og sæt i køleskab natten over.",
        "Lørdag morgen: Varm ovnen til 250°C med en støbejernsgryde indeni i mindst 45 minutter.",
        "Vend dejen direkte fra køleskabet ned i den glødende gryde. Rids overfladen med en skarp kniv eller rageblad. Bag med låg i 20 minutter, fjern låget og bag videre 20-25 minutter til skorpen er dyb mahognibrun.",
        "Det sværeste: Lad brødet køle helt af på en rist i mindst 1 time inden du skærer i det. Smulen sætter sig stadig inde i brødet."
      ])
    );
    await insertRecipeIngredient.run(r3.lastID, 16, "450", "g");
    await insertRecipeIngredient.run(r3.lastID, 17, "50", "g");
    await insertRecipeIngredient.run(r3.lastID, 20, "375", "g");
    await insertRecipeIngredient.run(r3.lastID, 19, "10", "g");
    await insertRecipeIngredient.run(r3.lastID, 21, "100", "g");
    await insertRecipeTag.run(r3.lastID, 6);
    await insertRecipeTag.run(r3.lastID, 7);

    // ── Opskrift 4: Torsk med beurre blanc ──
    const r4 = await insertRecipe.run(
      "Pandestegte torskeloins med beurre blanc", 25, "95.00",
      "https://www.greatbritishchefs.com/recipes/pan-fried-cod-beurre-blanc-recipe",
      "En smukt simpel ret der handler om råvarerne. Perfekt stegte torskeloins — sprød og gylden på den ene side, perlemorshvid og saftig igennem — med en klassisk fransk smørsauce der binder det hele.",
      JSON.stringify([
        "Tag torsken ud af køleskabet 20 minutter inden tilberedning — tempereret fisk steger mere jævnt. Dup dem tørre med køkkenrulle og krydr med salt.",
        "Beurre blanc: Kog hvidvin, finthakket skalotteløg og en skvæt citronsaft ind til næsten ingenting i en lille kasserolle. Tilsæt fløden og kog ind til det halve. Skru ned til meget lav varme.",
        "Pisk koldt smør i den varme reduktion — et par tern ad gangen — til saucen er blank, tyk og emulgeret. Smag til med salt og citronsaft. Hold varm over vandbad.",
        "Varm olivenolie i en pande til den er meget varm. Læg torsken i med skindsiden nedad (eller den pæneste side). Pres let ned de første 10 sekunder. Steg uden at røre i 4-5 minutter til den er gylden og knasende.",
        "Vend forsigtigt og steg 1-2 minutter på den anden side. Fisken er færdig når den akkurat er uigennemsigtig igennem.",
        "Anret torsken med den gyldne side opad. Hæld beurre blanc henover ved bordet."
      ])
    );
    await insertRecipeIngredient.run(r4.lastID, 23, "600", "g");
    await insertRecipeIngredient.run(r4.lastID, 24, "150", "ml");
    await insertRecipeIngredient.run(r4.lastID, 25, "2", "stk");
    await insertRecipeIngredient.run(r4.lastID, 26, "150", "g");
    await insertRecipeIngredient.run(r4.lastID, 27, "2", "spsk");
    await insertRecipeIngredient.run(r4.lastID, 28, "1", "stk");
    await insertRecipeTag.run(r4.lastID, 5);
    await insertRecipeTag.run(r4.lastID, 3);

    await db.exec("COMMIT");
    console.log("Database seeded successfully");
  } catch (err) {
    console.error("Error seeding database:", err);
    await db.exec("ROLLBACK").catch(() => {});
  }
}