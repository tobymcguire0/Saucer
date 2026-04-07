// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultTaxonomy } from "../src/lib/defaultTaxonomy";
import type { Recipe, Taxonomy } from "../src/lib/models";
import { ObsidianRecipeStore } from "../src/lib/persistence";

vi.mock("../src/lib/searchIndex", () => ({
  SqliteSearchIndex: class {
    async rebuild() {}

    async queryRecipeIds() {
      throw new Error("search index unavailable in test");
    }
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import App from "../src/App";

function findTagId(taxonomy: Taxonomy, categoryName: string, tagName: string) {
  const category = taxonomy.categories.find((entry) => entry.name === categoryName);
  const tag = taxonomy.tags.find(
    (entry) => entry.categoryId === category?.id && entry.name === tagName,
  );

  if (!tag) {
    throw new Error(`Missing tag ${categoryName}/${tagName}`);
  }

  return tag.id;
}

async function seedRecipe(recipe: Recipe, taxonomy: Taxonomy) {
  const store = new ObsidianRecipeStore(window.localStorage);
  await store.replaceAll([recipe], taxonomy);
}

describe("recipe browse and detail UI", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("truncates card tags, deprioritizes ingredient tags, and opens a full detail view", async () => {
    const taxonomy = createDefaultTaxonomy();
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: "recipe-layered-pasta-bake",
      title: "Layered Pasta Bake",
      summary: "A baked pasta dinner with a long list of tags for preview testing.",
      sourceType: "manual",
      ingredients: [
        { id: "ingredient-1", name: "Spaghetti", raw: "300g spaghetti" },
        { id: "ingredient-2", name: "Eggs", raw: "2 eggs" },
      ],
      instructions: ["Boil pasta.", "Assemble the bake.", "Cook until bubbling."],
      servings: "4 people",
      cuisine: "Italian",
      mealType: "Dinner",
      rating: 2,
      tagIds: [
        findTagId(taxonomy, "Meal-Time", "Dinner"),
        findTagId(taxonomy, "Cuisine", "Italian"),
        findTagId(taxonomy, "Course", "Main"),
        findTagId(taxonomy, "Difficulty", "Easy"),
        findTagId(taxonomy, "Time", "Quick"),
        findTagId(taxonomy, "Equipment", "Oven"),
        findTagId(taxonomy, "Occasion", "Weeknight"),
        findTagId(taxonomy, "Flavor", "Savory"),
        findTagId(taxonomy, "Ingredients", "Pasta"),
        findTagId(taxonomy, "Ingredients", "Egg"),
      ],
      createdAt: now,
      updatedAt: now,
    };

    await seedRecipe(recipe, taxonomy);

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Open Layered Pasta Bake" })).toBeTruthy(),
    );

    const card = screen.getByTestId("recipe-card-recipe-layered-pasta-bake");
    expect(within(card).getByText("+5 more")).toBeTruthy();
    expect(within(card).queryByText(/^Pasta$/)).toBeNull();
    expect(within(card).queryByText(/^Egg$/)).toBeNull();

    await user.click(card);

    const detailView = await screen.findByTestId("recipe-detail-view");
    expect(within(detailView).getByText("Layered Pasta Bake")).toBeTruthy();
    expect(within(detailView).getByText(/^Pasta$/)).toBeTruthy();
    expect(within(detailView).getByText(/^Egg$/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Back to browse" }));
    expect(screen.getByRole("button", { name: "Open Layered Pasta Bake" })).toBeTruthy();
  });

  it("supports hover preview and click for star ratings", async () => {
    const taxonomy = createDefaultTaxonomy();
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: "recipe-star-test",
      title: "Star Test",
      summary: "A recipe used to verify star ratings.",
      sourceType: "manual",
      ingredients: [{ id: "ingredient-1", name: "Rice", raw: "2 cups rice" }],
      instructions: ["Cook rice."],
      servings: "2 people",
      cuisine: "Japanese",
      mealType: "Dinner",
      rating: 2,
      tagIds: [findTagId(taxonomy, "Meal-Time", "Dinner")],
      createdAt: now,
      updatedAt: now,
    };

    await seedRecipe(recipe, taxonomy);

    const user = userEvent.setup();
    render(<App />);

    const card = await screen.findByTestId("recipe-card-recipe-star-test");
    const fourStar = within(card).getByRole("button", { name: "Rate Star Test: 4 stars" });

    await user.hover(fourStar);
    expect(fourStar.className).toContain("rating-star-filled");

    await user.click(fourStar);

    await waitFor(() =>
      expect(screen.getByTestId("status-bar").textContent).toContain("Recipe rating updated."),
    );
    expect(within(card).getByRole("button", { name: "Rate Star Test: 4 stars" }).className).toContain(
      "rating-star-filled",
    );
  });

  it("requires a second delete click before removing a recipe", async () => {
    const taxonomy = createDefaultTaxonomy();
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: "recipe-delete-test",
      title: "Delete Test",
      summary: "A recipe used to verify delete confirmation.",
      sourceType: "manual",
      ingredients: [{ id: "ingredient-1", name: "Beans", raw: "1 can beans" }],
      instructions: ["Heat the beans."],
      servings: "2 people",
      cuisine: "Tex-Mex",
      mealType: "Dinner",
      rating: 0,
      tagIds: [findTagId(taxonomy, "Meal-Time", "Dinner")],
      createdAt: now,
      updatedAt: now,
    };

    await seedRecipe(recipe, taxonomy);

    const user = userEvent.setup();
    render(<App />);

    const card = await screen.findByTestId("recipe-card-recipe-delete-test");

    await user.click(within(card).getByRole("button", { name: "Delete" }));
    expect(within(card).getByRole("button", { name: "Confirm delete" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Delete Test" })).toBeTruthy();

    await user.click(within(card).getByRole("button", { name: "Confirm delete" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Open Delete Test" })).toBeNull(),
    );
    expect(screen.getByTestId("status-bar").textContent).toContain("Recipe deleted.");
  });

  it("opens the random recipe in the detail view", async () => {
    const taxonomy = createDefaultTaxonomy();
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: "recipe-random-test",
      title: "Random Test",
      summary: "A recipe used to verify random recipe navigation.",
      sourceType: "manual",
      ingredients: [{ id: "ingredient-1", name: "Rice", raw: "1 cup rice" }],
      instructions: ["Cook the rice."],
      servings: "2 people",
      cuisine: "Japanese",
      mealType: "Dinner",
      rating: 0,
      tagIds: [findTagId(taxonomy, "Meal-Time", "Dinner")],
      createdAt: now,
      updatedAt: now,
    };

    await seedRecipe(recipe, taxonomy);

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pick random recipe" })).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Pick random recipe" }));

    const detailView = await screen.findByTestId("recipe-detail-view");
    expect(within(detailView).getByText("Random Test")).toBeTruthy();
  });

  it("highlights the active workspace button with nav-active class", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByText("Cookbook loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    const browseBtn = screen.getByRole("button", { name: "Browse recipes" });
    const taxonomyBtn = screen.getByRole("button", { name: "Manage taxonomy" });

    expect(browseBtn.className).toContain("nav-active");
    expect(taxonomyBtn.className).not.toContain("nav-active");

    const user = userEvent.setup();
    await user.click(taxonomyBtn);

    expect(taxonomyBtn.className).toContain("nav-active");
    expect(browseBtn.className).not.toContain("nav-active");
  });

  it("creates a new tag under an existing category while editing a recipe draft", async () => {
    const user = userEvent.setup();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByText("Cookbook loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Upload Recipe" }));
    await user.click(screen.getByRole("button", { name: "manual" }));

    const cuisineInput = screen.getByPlaceholderText("Add a Cuisine tag");
    const cuisineRow = cuisineInput.parentElement;
    if (!cuisineRow) {
      throw new Error("Cuisine tag row not found");
    }
    await user.type(cuisineInput, "Fusion");
    await user.click(within(cuisineRow).getByRole("button", { name: "Add tag" }));

    await waitFor(() =>
      expect(screen.getByTestId("status-bar").textContent).toContain('Tag "Fusion" added to the recipe form.'),
    );

    const fusionButtons = screen.getAllByRole("button", { name: "Fusion" });
    expect(fusionButtons.some((button) => button.className.includes("chip-active"))).toBe(true);
  });

  it("shows only relevant draft taxonomy chips above the confidence threshold", async () => {
    const user = userEvent.setup();

    render(<App />);

    await waitFor(() =>
      expect(screen.getByText("Cookbook loaded from local Obsidian-style storage.")).toBeTruthy(),
    );

    await user.click(screen.getByRole("button", { name: "Upload Recipe" }));
    await user.click(screen.getByRole("button", { name: "manual" }));
    await user.type(screen.getByLabelText("Cuisine"), "Italian");
    await user.type(screen.getByLabelText("Meal type"), "Dinner");
    await user.type(screen.getByLabelText("Ingredients"), "300g spaghetti{enter}1 dragonfruit");

    const editAssignedTags = screen.getByText("Edit assigned tags").closest("section");
    const suggestedTags = screen.getByText("Suggested tags").closest("section");

    expect(editAssignedTags).toBeTruthy();
    expect(suggestedTags).toBeTruthy();

    const editScope = within(editAssignedTags!);
    const suggestionScope = within(suggestedTags!);

    expect(editScope.getByRole("button", { name: "Italian" })).toBeTruthy();
    expect(editScope.getByRole("button", { name: "Dinner" })).toBeTruthy();
    expect(editScope.getByRole("button", { name: "Pasta" })).toBeTruthy();
    expect(editScope.queryByRole("button", { name: "Japanese" })).toBeNull();
    expect(editScope.queryByRole("button", { name: "Breakfast" })).toBeNull();
    expect(suggestionScope.queryByRole("button", { name: /dragonfruit/i })).toBeNull();
  });
});
