import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "./index.js";

let server;
let baseUrl;

beforeAll(async () => {
  server = await createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();

  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { response, text, json };
}

describe("backend HTTP server", () => {
  it("serves health and API metadata endpoints", async () => {
    const health = await request("/health/");
    expect(health.response.status).toBe(200);
    expect(health.json).toMatchObject({
      status: "ok",
      timestamp: expect.any(String),
    });

    const api = await request("/api/");
    expect(api.response.status).toBe(200);
    expect(api.json).toEqual({
      message: "Cookbook API",
      version: "1.0.0",
      endpoints: {
        recipe: "/api/recipe",
      },
    });
  });

  it("serves Swagger UI without Express", async () => {
    const docs = await request("/apidocs");
    expect(docs.response.status).toBe(200);
    expect(docs.response.headers.get("content-type")).toContain("text/html");
    expect(docs.text).toContain("SwaggerUIBundle");

    const asset = await request("/apidocs/swagger-ui-bundle.js");
    expect(asset.response.status).toBe(200);
    expect(asset.response.headers.get("content-type")).toContain("text/javascript");
  });

  it("lists recipe resources", async () => {
    const recipes = await request("/api/recipe/recipes/");
    expect(recipes.response.status).toBe(200);
    expect(recipes.json.length).toBeGreaterThan(0);

    const countryRecipes = await request("/api/recipe/recipes/country/italy/");
    expect(countryRecipes.response.status).toBe(200);
    expect(countryRecipes.json.length).toBeGreaterThan(0);

    const ingredients = await request("/api/recipe/ingredients/");
    expect(ingredients.response.status).toBe(200);
    expect(Array.isArray(ingredients.json)).toBe(true);

    const tags = await request("/api/recipe/tags/");
    expect(tags.response.status).toBe(200);
    expect(Array.isArray(tags.json)).toBe(true);
  });

  it("supports recipe CRUD through the node:http routing layer", async () => {
    const payload = {
      title: `HTTP Test Recipe ${Date.now()}`,
      description: "created through http server test",
      time_minutes: 15,
      price: "25",
      link: "https://example.com/test-recipe",
      instructions: ["mix", "serve"],
      ingredients: [{ name: "Test Ingredient", amount: "2", unit: "pcs" }],
      tags: [{ name: "Test Tag" }],
      country: "denmark",
    };

    const created = await request("/api/recipe/recipes/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    expect(created.response.status).toBe(201);
    expect(created.json).toMatchObject(payload);
    expect(created.json.id).toEqual(expect.any(Number));

    const recipeId = created.json.id;

    const fetched = await request(`/api/recipe/recipes/${recipeId}/`);
    expect(fetched.response.status).toBe(200);
    expect(fetched.json).toMatchObject({
      id: recipeId,
      title: payload.title,
      instructions: payload.instructions,
    });

    const updatedPayload = {
      ...payload,
      title: `${payload.title} updated`,
      ingredients: [{ name: "Updated Ingredient", amount: "1", unit: "bowl" }],
      tags: [{ name: "Updated Tag" }],
    };

    const updated = await request(`/api/recipe/recipes/${recipeId}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedPayload),
    });
    expect(updated.response.status).toBe(200);
    expect(updated.json).toMatchObject({
      id: recipeId,
      title: updatedPayload.title,
    });

    const deleted = await request(`/api/recipe/recipes/${recipeId}/`, {
      method: "DELETE",
    });
    expect(deleted.response.status).toBe(204);
    expect(deleted.text).toBe("");

    const missing = await request(`/api/recipe/recipes/${recipeId}/`);
    expect(missing.response.status).toBe(404);
    expect(missing.json).toEqual({
      error: "Opskriften blev ikke fundet.",
    });
  });

  it("returns 400 for invalid payloads", async () => {
    const missingTitle = await request("/api/recipe/recipes/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description: "missing title" }),
    });
    expect(missingTitle.response.status).toBe(400);
    expect(missingTitle.json).toEqual({
      error: "Opskriften skal have et navn.",
    });

    const invalidJson = await request("/api/recipe/recipes/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{not-valid-json}",
    });
    expect(invalidJson.response.status).toBe(400);
    expect(invalidJson.json).toEqual({
      error: "Invalid JSON body.",
    });
  });

  it("supports user registration, login, and authenticated profile updates", async () => {
    const unique = Date.now();
    const email = `auth-${unique}@example.com`;
    const password = "correct-password";

    const created = await request("/api/user/create/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name: "Test User",
      }),
    });

    expect(created.response.status).toBe(201);
    expect(created.json.token).toEqual(expect.any(String));
    expect(created.json.user).toEqual({
      id: expect.any(Number),
      email,
      name: "Test User",
    });
    expect(JSON.stringify(created.json)).not.toContain(password);

    const duplicate = await request("/api/user/create/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name: "Duplicate",
      }),
    });
    expect(duplicate.response.status).toBe(409);

    const badLogin = await request("/api/user/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: "wrong-password",
      }),
    });
    expect(badLogin.response.status).toBe(401);

    const login = await request("/api/user/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    expect(login.response.status).toBe(200);
    expect(login.json.token).toEqual(expect.any(String));
    expect(login.json.user.email).toBe(email);

    const missingToken = await request("/api/user/me/");
    expect(missingToken.response.status).toBe(401);

    const me = await request("/api/user/me/", {
      headers: {
        Authorization: `Bearer ${login.json.token}`,
      },
    });
    expect(me.response.status).toBe(200);
    expect(me.json).toEqual(login.json.user);

    const updatedEmail = `auth-updated-${unique}@example.com`;
    const updated = await request("/api/user/me/", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${login.json.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: updatedEmail,
        name: "Updated User",
      }),
    });
    expect(updated.response.status).toBe(200);
    expect(updated.json).toEqual({
      id: login.json.user.id,
      email: updatedEmail,
      name: "Updated User",
    });

    const relogin = await request("/api/user/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: updatedEmail,
        password,
      }),
    });
    expect(relogin.response.status).toBe(200);
  });

  it("returns 404 for unknown routes", async () => {
    const missing = await request("/missing");
    expect(missing.response.status).toBe(404);
    expect(missing.json).toEqual({
      error: "Ikke fundet.",
    });
  });

  it("responds to CORS preflight requests", async () => {
    const response = await fetch(`${baseUrl}/api/recipe/recipes/`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
    expect(response.headers.get("access-control-allow-headers")).toBe("Content-Type");
  });
});
