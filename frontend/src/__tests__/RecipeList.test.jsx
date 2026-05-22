import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RecipeList from "../pages/RecipeList";

// Mock API-laget så testen aldrig rammer netværket
vi.mock("../api/recipes", () => ({
  listRecipes: vi.fn(),
}));

// Hent mock-referencen EFTER vi.mock er sat op
import { listRecipes } from "../api/recipes";

describe("RecipeList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("viser loading-state med det samme", () => {
    // Returner et løfte der aldrig resolverer → spinner forbliver synlig
    listRecipes.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <RecipeList />
      </MemoryRouter>
    );

    expect(screen.getByText(/Henter opskrifter/i)).toBeInTheDocument();
  });

  it("viser opskrifter når API-kaldet lykkes", async () => {
    listRecipes.mockResolvedValue([
      {
        id: 1,
        title: "Pasta Bolognese",
        tags: [{ id: 1, name: "Italiensk" }],
        ingredients: [{ name: "Spaghetti" }, { name: "Hakket oksekød" }],
        time_minutes: 30,
        price: null,
        image: null,
      },
    ]);

    render(
      <MemoryRouter>
        <RecipeList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Pasta Bolognese")).toBeInTheDocument();
    });

    // Tagget vises både i filter-bjælken og på kortet — brug getAllByText
    expect(screen.getAllByText("Italiensk").length).toBeGreaterThan(0);
  });

  it("viser fejlbesked når API-kaldet fejler", async () => {
    listRecipes.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <RecipeList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Kunne ikke hente opskrifter/i)
      ).toBeInTheDocument();
    });
  });

  it("viser \"Ingen opskrifter endnu\" når listen er tom", async () => {
    listRecipes.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <RecipeList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ingen opskrifter endnu/i)).toBeInTheDocument();
    });
  });
});
