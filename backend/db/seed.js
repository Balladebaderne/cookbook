import { db } from "./index.js";

export async function seedDb() {
  try {
    const insertIngredient = db.prepare("INSERT INTO ingredients (name) VALUES (?)");
    const insertTag = db.prepare("INSERT INTO tags (name) VALUES (?)");
    const insertRecipe = db.prepare("INSERT INTO recipes (title, time_minutes, price, link, description, instructions, image, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
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
      ]),
      "https://i.pinimg.com/1200x/f2/9f/f7/f29ff752fe9b098e8a3c9e73d5de2dec.jpg", "italy"
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
      ]),
      "https://i.pinimg.com/1200x/97/05/d6/9705d67b884b9bab4ad06858468666bb.jpg", "denmark"
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
      ]),
      "https://i.pinimg.com/1200x/53/2c/ea/532cea66f74f8b7f546cd471ee8f5573.jpg", "denmark"
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
      ]),
      "https://i.pinimg.com/1200x/11/ca/71/11ca71a2b2ae94f5d19697695b75409e.jpg", "france"
    );
    await insertRecipeIngredient.run(r4.lastID, 23, "600", "g");
    await insertRecipeIngredient.run(r4.lastID, 24, "150", "ml");
    await insertRecipeIngredient.run(r4.lastID, 25, "2", "stk");
    await insertRecipeIngredient.run(r4.lastID, 26, "150", "g");
    await insertRecipeIngredient.run(r4.lastID, 27, "2", "spsk");
    await insertRecipeIngredient.run(r4.lastID, 28, "1", "stk");
    await insertRecipeTag.run(r4.lastID, 5);
    await insertRecipeTag.run(r4.lastID, 3);

    // ── New ingredients for remaining countries (29-60) ──
    await insertIngredient.run("Kyllingebryst");           // 29
    await insertIngredient.run("Panko rasp");              // 30
    await insertIngredient.run("Japansk karry");           // 31
    await insertIngredient.run("Kartoffel");               // 32
    await insertIngredient.run("Ris");                     // 33
    await insertIngredient.run("Svinekød (nakkefilet)");   // 34
    await insertIngredient.run("Ananas");                  // 35
    await insertIngredient.run("Chipotle i adobo");        // 36
    await insertIngredient.run("Koriander (frisk)");       // 37
    await insertIngredient.run("Lime");                    // 38
    await insertIngredient.run("Hvede-tortillas");         // 39
    await insertIngredient.run("Achiote-pasta");           // 40
    await insertIngredient.run("Kyllingelår (udbenet)");   // 41
    await insertIngredient.run("Yoghurt (naturel)");       // 42
    await insertIngredient.run("Garam masala");            // 43
    await insertIngredient.run("Flåede tomater");          // 44
    await insertIngredient.run("Ingefær (frisk)");         // 45
    await insertIngredient.run("Chili (frisk grøn)");      // 46
    await insertIngredient.run("Lammebov");                // 47
    await insertIngredient.run("Dadler (tørrede)");        // 48
    await insertIngredient.run("Mandler (hele)");          // 49
    await insertIngredient.run("Safran");                  // 50
    await insertIngredient.run("Kanel (stang)");           // 51
    await insertIngredient.run("Spidskommen");             // 52
    await insertIngredient.run("Kikærter (dåse)");         // 53
    await insertIngredient.run("Risnudler (brede)");       // 54
    await insertIngredient.run("Rejer (pillede)");         // 55
    await insertIngredient.run("Tamarindpasta");           // 56
    await insertIngredient.run("Fiskesauce");              // 57
    await insertIngredient.run("Peanuts (ristede)");       // 58
    await insertIngredient.run("Bønnespirer");             // 59
    await insertIngredient.run("Forårsløg");               // 60

    // ── New tags (8-13) ──
    await insertTag.run("Japansk");      // 8
    await insertTag.run("Mexicansk");    // 9
    await insertTag.run("Streetfood");   // 10
    await insertTag.run("Indisk");       // 11
    await insertTag.run("Marokkansk");   // 12
    await insertTag.run("Thailandsk");   // 13

    // ── Opskrift 5: Chicken Katsu Curry (Japan) ──
    const r5 = await insertRecipe.run(
      "Chicken Katsu Curry", 50, "55.00",
      "https://www.justonecookbook.com/katsu-curry/",
      "Japansk comfort food i verdensklasse. Sprød, panko-paneret kylling serveret over dampende ris med en blød, sødlig karry-sauce der er helt sin egen — tykkere og mere frugtig end indisk karry. Ugens bedste tirsdag.",
      JSON.stringify([
        "Kog karry-saucen: Svits løg og gulerod i smør til bløde. Tilsæt japansk karrypasta og 500 ml vand. Kog 15 minutter til saucen er tyk og glat.",
        "Bank kyllingebrysterne flade med en kødhammer. Krydr med salt og peber.",
        "Paner kyllingen: mel → pisket æg → panko rasp. Tryk panko-en godt fast.",
        "Steg kyllingen i rigeligt olie ved 170°C i 5-6 minutter per side til den er dybt gylden og gennemstegt.",
        "Lad kyllingen hvile 2 minutter på et rist, skær derefter i tykke skiver på skrå.",
        "Anret over dampende ris. Hæld karry-saucen ved siden af, så panko'en forbliver sprød."
      ]),
      "https://i.pinimg.com/1200x/bb/7c/97/bb7c9754d6a10f5742fd52f8e59b6a65.jpg", "japan"
    );
    await insertRecipeIngredient.run(r5.lastID, 29, "2", "stk");
    await insertRecipeIngredient.run(r5.lastID, 30, "100", "g");
    await insertRecipeIngredient.run(r5.lastID, 31, "80", "g");
    await insertRecipeIngredient.run(r5.lastID, 13, "1", "stk");
    await insertRecipeIngredient.run(r5.lastID, 14, "1", "stk");
    await insertRecipeIngredient.run(r5.lastID, 33, "300", "g");
    await insertRecipeIngredient.run(r5.lastID, 3, "2", "stk");
    await insertRecipeIngredient.run(r5.lastID, 16, "50", "g");
    await insertRecipeTag.run(r5.lastID, 8);
    await insertRecipeTag.run(r5.lastID, 3);

    // ── Opskrift 6: Tacos al Pastor (Mexico) ──
    const r6 = await insertRecipe.run(
      "Tacos al Pastor", 75, "65.00",
      "https://www.seriouseats.com/tacos-al-pastor-recipe",
      "Mexico Citys mest ikoniske streetfood. Tyndt skåret svinekød marineret i en rød, let sød achiote-chili marinade, grillet til karamelliseret og serveret med frisk ananas, koriander og lime i varme tortillas.",
      JSON.stringify([
        "Bland achiote-pasta, chipotle i adobo, hvidløg, appelsinsaft, eddike og krydderier til en glat marinade i en blender.",
        "Skær svinekødet i tynde skiver (3-4 mm) og vend det grundigt i marinaden. Dæk til og lad det trække mindst 2 timer — gerne natten over.",
        "Varm en grillpande eller grill til høj varme. Gril kødet i 2-3 minutter per side til karamelliseret og let forkullede kanter.",
        "Gril ananas-skiver ved siden af til de har grillmærker — ca. 2 minutter per side. Skær i små tern.",
        "Varm tortillas direkte over en gasflamme eller i en tør pande til de er bløde og let svitsede.",
        "Saml tacos: kød, ananas, finthakket løg, koriander og et generøst skvæt lime. Server straks."
      ]),
      "https://i.pinimg.com/1200x/8f/41/fd/8f41fd55427d5ddff6f637299064f142.jpg", "mexico"
    );
    await insertRecipeIngredient.run(r6.lastID, 34, "600", "g");
    await insertRecipeIngredient.run(r6.lastID, 35, "4", "skiver");
    await insertRecipeIngredient.run(r6.lastID, 36, "2", "stk");
    await insertRecipeIngredient.run(r6.lastID, 40, "50", "g");
    await insertRecipeIngredient.run(r6.lastID, 37, "1", "bundt");
    await insertRecipeIngredient.run(r6.lastID, 38, "3", "stk");
    await insertRecipeIngredient.run(r6.lastID, 13, "1", "stk");
    await insertRecipeIngredient.run(r6.lastID, 39, "12", "stk");
    await insertRecipeTag.run(r6.lastID, 9);
    await insertRecipeTag.run(r6.lastID, 10);

    // ── Opskrift 7: Butter Chicken (Indien) ──
    const r7 = await insertRecipe.run(
      "Butter Chicken (Murgh Makhani)", 60, "72.00",
      "https://www.indianhealthyrecipes.com/butter-chicken/",
      "Den cremede, tomatsødme klassiker fra Delhi. Kylling marineret i krydret yoghurt, grillet til røget og svøbt i en silkeblød sauce af tomater, smør og fløde. Bedre end takeaway — og du ved hvad der er i.",
      JSON.stringify([
        "Marinér kyllingelårene: Bland yoghurt, garam masala, chili, ingefær og hvidløg. Vend kyllingen i marinaden og lad den trække mindst 1 time, helst 4.",
        "Gril eller steg kyllingen ved høj varme i 5-6 minutter per side til let forkullede kanter. Sæt til side.",
        "Sauce: Svits løg, ingefær og hvidløg i smør til gyldne. Tilsæt flåede tomater, garam masala og lad det koge 20 minutter.",
        "Blend saucen glat. Sigt den tilbage i gryden for en helt silkeblød konsistens.",
        "Tilsæt fløde og smør. Læg kyllingen i saucen og lad det simre 10 minutter til saucen er tyk og klæber til kødet.",
        "Smag til med salt og et drys tørret fenugreek (kasuri methi) hvis du har det. Server med naan eller basmatiris."
      ]),
      "https://i.pinimg.com/1200x/a0/48/4c/a0484cc5bc54fd2d7298f8bb56b257ae.jpg", "india"
    );
    await insertRecipeIngredient.run(r7.lastID, 41, "800", "g");
    await insertRecipeIngredient.run(r7.lastID, 42, "150", "g");
    await insertRecipeIngredient.run(r7.lastID, 43, "2", "spsk");
    await insertRecipeIngredient.run(r7.lastID, 44, "400", "g");
    await insertRecipeIngredient.run(r7.lastID, 26, "60", "g");
    await insertRecipeIngredient.run(r7.lastID, 27, "100", "ml");
    await insertRecipeIngredient.run(r7.lastID, 10, "4", "fed");
    await insertRecipeIngredient.run(r7.lastID, 45, "3", "cm");
    await insertRecipeIngredient.run(r7.lastID, 46, "2", "stk");
    await insertRecipeTag.run(r7.lastID, 11);
    await insertRecipeTag.run(r7.lastID, 3);

    // ── Opskrift 8: Lam-tagine med dadler og mandler (Marokko) ──
    const r8 = await insertRecipe.run(
      "Lam-tagine med dadler og mandler", 150, "88.00",
      "https://www.bbcgoodfood.com/recipes/lamb-tagine",
      "Marokkansk langsom madlavning på sit bedste. Mørt lammekød, søde dadler, knas af ristede mandler og en aromatisk sauce gennemsyret af safran, kanel og spidskommen. Huset dufter fantastisk i timevis.",
      JSON.stringify([
        "Skær lammebov i store tern (4-5 cm). Krydr med salt, spidskommen og kanel. Brun kødet i olivenolie i en tung gryde — arbejd i hold så du får stege-skorpe, ikke damp.",
        "Svits løg og hvidløg i samme gryde til bløde. Tilsæt safran opløst i 2 spsk varmt vand, resten af krydderierne og tomatpuré. Rør 2 minutter.",
        "Læg kødet tilbage, tilsæt 400 ml vand og bring i kog. Skru ned til lavt blus, dæk med låg og lad det simre i 1½ time.",
        "Tilsæt dadler og drænet kikærter. Simre yderligere 30 minutter til kødet falder fra hinanden og saucen er tyk.",
        "Rist mandler på en tør pande til gyldne — de brænder hurtigt, så hold øje.",
        "Server taginen drysset med ristede mandler og frisk koriander. Couscous eller brød ved siden af."
      ]),
      "https://i.pinimg.com/1200x/b1/a5/68/b1a5685cc332e1c047b67adce392790b.jpg", "morocco"
    );
    await insertRecipeIngredient.run(r8.lastID, 47, "800", "g");
    await insertRecipeIngredient.run(r8.lastID, 48, "100", "g");
    await insertRecipeIngredient.run(r8.lastID, 49, "60", "g");
    await insertRecipeIngredient.run(r8.lastID, 50, "1", "knivspids");
    await insertRecipeIngredient.run(r8.lastID, 51, "1", "stk");
    await insertRecipeIngredient.run(r8.lastID, 52, "2", "tsk");
    await insertRecipeIngredient.run(r8.lastID, 13, "2", "stk");
    await insertRecipeIngredient.run(r8.lastID, 53, "1", "dåse");
    await insertRecipeIngredient.run(r8.lastID, 37, "1", "bundt");
    await insertRecipeTag.run(r8.lastID, 12);
    await insertRecipeTag.run(r8.lastID, 4);

    // ── Opskrift 9: Pad Thai (Thailand) ──
    const r9 = await insertRecipe.run(
      "Pad Thai", 30, "58.00",
      "https://hot-thai-kitchen.com/pad-thai/",
      "Bangkoks berømte gadenudler. Bløde risnudler vendt i en balanceret sauce af tamarind, fiskesauce og palmesukker med sprøde peanuts, friske bønnespirer og et skvæt lime. Hemmeligheden er wok hei — høj varme, hurtige hænder.",
      JSON.stringify([
        "Udbløds risnudler i varmt vand i 15-20 minutter til bøjelige men stadig faste — de skal ikke være bløde endnu. Dræn.",
        "Bland saucen: 3 spsk tamarindpasta, 2 spsk fiskesauce, 2 spsk sukker og 1 spsk vand. Rør til sukkeret er opløst.",
        "Varm en wok til rygende. Steg rejerne i 1 minut og sæt til side. Tilsæt olie, piskede æg og rør til store klumper. Sæt også til side.",
        "I samme wok: tilsæt lidt olie, nudlerne og hele saucen. Vend med tang i 2-3 minutter til nudlerne har absorberet saucen og er bløde.",
        "Tilsæt rejer, æg, halvdelen af bønnespirerne og forårsløg. Vend hurtigt sammen.",
        "Anret med ristede peanuts, resten af bønnespirerne, limebåde og frisk koriander."
      ]),
      "https://i.pinimg.com/1200x/86/36/0d/86360d6aa83b4570417451bcb4d03350.jpg", "thailand"
    );
    await insertRecipeIngredient.run(r9.lastID, 54, "250", "g");
    await insertRecipeIngredient.run(r9.lastID, 55, "200", "g");
    await insertRecipeIngredient.run(r9.lastID, 56, "3", "spsk");
    await insertRecipeIngredient.run(r9.lastID, 57, "2", "spsk");
    await insertRecipeIngredient.run(r9.lastID, 58, "50", "g");
    await insertRecipeIngredient.run(r9.lastID, 59, "100", "g");
    await insertRecipeIngredient.run(r9.lastID, 3, "2", "stk");
    await insertRecipeIngredient.run(r9.lastID, 38, "2", "stk");
    await insertRecipeIngredient.run(r9.lastID, 60, "3", "stk");
    await insertRecipeTag.run(r9.lastID, 13);
    await insertRecipeTag.run(r9.lastID, 10);

    await db.exec("COMMIT");
    console.log("Database seeded successfully");
  } catch (err) {
    console.error("Error seeding database:", err);
    await db.exec("ROLLBACK").catch(() => {});
  }
}
