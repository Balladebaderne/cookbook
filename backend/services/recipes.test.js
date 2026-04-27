import { describe, it, expect, beforeAll } from "vitest";
import { initDb } from "../db/schema.js";
import * as recipes from "./recipes.js";

beforeAll(async () => {
  await initDb();
});

describe("services/recipes", () => {
  it("listRecipes returns all 9 seeded recipes with the expected shape", async () => {
    const all = await recipes.listRecipes();
    expect(all).toHaveLength(9);
    expect(all[0]).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      time_minutes: expect.any(Number),
      ingredients: expect.any(Array),
      tags: expect.any(Array),
    });
  });

  it("getRecipe returns a falsy value for a missing id", async () => {
    const r = await recipes.getRecipe(99999);
    expect(r).toBeFalsy();
  });

  it("createRecipe inserts a row and the new recipe shows up in listRecipes", async () => {
    const before = await recipes.listRecipes();
    const id = await recipes.createRecipe({
      title: "Test Recipe",
      time_minutes: 10,
      price: "0",
      ingredients: [{ name: "TestIng", amount: "1", unit: "stk" }],
      tags: [{ name: "TestTag" }],
    });
    const after = await recipes.listRecipes();
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((r) => r.id === id)?.title).toBe("Test Recipe");
  });
});
