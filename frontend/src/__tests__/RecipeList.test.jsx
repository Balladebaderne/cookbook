import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RecipeList from "../pages/RecipeList";

// Mock the API layer so the test never hits the network
vi.mock("../api/recipes", () => ({
  listRecipes: vi.fn(),
}));

// Grab the mock reference AFTER vi.mock is set up
import { listRecipes } from "../api/recipes";

describe("RecipeList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the loading state immediately", () => {
    // Return a promise that never resolves → the spinner stays visible
    listRecipes.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <RecipeList />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading recipes/i)).toBeInTheDocument();
  });

  it("shows recipes when the API call succeeds", async () => {
    listRecipes.mockResolvedValue([
      {
        id: 1,
        title: "Pasta Bolognese",
        tags: [{ id: 1, name: "Italian" }],
        ingredients: [{ name: "Spaghetti" }, { name: "Ground beef" }],
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

    // The tag appears both in the filter bar and on the card — use getAllByText
    expect(screen.getAllByText("Italian").length).toBeGreaterThan(0);
  });

  it("shows an error message when the API call fails", async () => {
    listRecipes.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <RecipeList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Could not load recipes/i)
      ).toBeInTheDocument();
    });
  });

  it("shows \"No recipes yet\" when the list is empty", async () => {
    listRecipes.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <RecipeList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No recipes yet/i)).toBeInTheDocument();
    });
  });
});
