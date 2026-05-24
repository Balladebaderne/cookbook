import { describe, expect, it } from "vitest";
import { loadSeedData } from "./seed.js";

describe("seed data", () => {
  it("loads structured recipe data from JSON", async () => {
    const recipes = await loadSeedData();

    expect(recipes).toHaveLength(20);
    expect(recipes.every((recipe) => Array.isArray(recipe.ingredients))).toBe(true);
    expect(recipes.every((recipe) => Array.isArray(recipe.instructions))).toBe(true);
    expect(recipes.every((recipe) => Array.isArray(recipe.tags))).toBe(true);
  });

  it("keeps an Italy recipe available for country filtering", async () => {
    const recipes = await loadSeedData();

    expect(recipes.some((recipe) => recipe.country === "italy")).toBe(true);
  });
});
