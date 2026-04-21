import { describe, expect, it, vi } from "vitest";

import { ObsidianRecipeStore } from "../src/lib/persistence/obsidianStore";
import { parseRecipeMarkdown } from "../src/lib/persistence";
import { filterRecipes, groupRecipesByCategory } from "../src/lib/selectors";
import { createDefaultTaxonomy } from "../src/lib/defaultTaxonomy";
import type { Recipe } from "../src/lib/models";

describe("obsidian persistence and recipe selectors", () => {
  it("parses markdown recipes with frontmatter and list sections", () => {
    const recipe = parseRecipeMarkdown(`---
id: "recipe-1"
title: "Test Salad"
summary: "Fresh and crunchy."
sourceType: "manual"
sourceRef: ""
servings: "2"
cuisine: "Mediterranean"
mealType: "Lunch"
rating: 4
createdAt: "2026-04-05T00:00:00.000Z"
updatedAt: "2026-04-05T00:00:00.000Z"
tags:
  - "tag-course-salad"
---

# Test Salad

## Summary
Fresh and crunchy.

## Ingredients
- Lettuce
- Olive oil

## Instructions
1. Toss together.
2. Serve.
`);

    expect(recipe.title).toBe("Test Salad");
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.instructions[0]).toBe("Toss together.");
  });

  it("falls back to manual source type for invalid recipe frontmatter values", () => {
    const recipe = parseRecipeMarkdown(`---
id: "recipe-2"
title: "Questionable Import"
summary: "Unexpected source type."
sourceType: "desktop"
createdAt: "2026-04-05T00:00:00.000Z"
updatedAt: "2026-04-05T00:00:00.000Z"
tags: []
---

# Questionable Import

## Ingredients
- 1 mystery item

## Instructions
1. Save it anyway.
`);

    expect(recipe.sourceType).toBe("manual");
  });

  it("recovers from malformed stored vault snapshots", async () => {
    const store = new ObsidianRecipeStore({
      getItem: vi.fn(() => "{not-json"),
      setItem: vi.fn(),
    });

    const snapshot = await store.load();

    expect(snapshot.recipes).toEqual([]);
    expect(snapshot.taxonomy.categories.length).toBeGreaterThan(0);
  });

  it("filters and groups recipes by canonical tags", () => {
    const taxonomy = createDefaultTaxonomy();
    const dinnerTag = taxonomy.tags.find((tag) => tag.name === "Dinner");
    const mealTimeCategory = taxonomy.categories.find((category) => category.name === "Meal-Time");
    const now = new Date().toISOString();
    const recipes: Recipe[] = [
      {
        id: "recipe-dinner",
        title: "Dinner Bowl",
        summary: "Simple dinner recipe.",
        sourceType: "manual",
        sourceRef: undefined,
        heroImage: undefined,
        ingredients: [{ id: "ingredient-rice", name: "Rice", raw: "1 cup rice" }],
        instructions: ["Cook rice."],
        servings: "2",
        cuisine: "Japanese",
        mealType: "Dinner",
        rating: 4,
        tagIds: [dinnerTag?.id ?? ""].filter(Boolean),
        createdAt: now,
        updatedAt: now,
      },
    ];

    expect(dinnerTag).toBeTruthy();
    expect(mealTimeCategory).toBeTruthy();

    const filtered = filterRecipes(recipes, {
      searchText: "",
      selectedTagIds: [dinnerTag!.id],
      excludedTagIds: [],
      requiredIngredientTerms: [],
      sortBy: "title",
    });

    expect(filtered.every((recipe) => recipe.tagIds.includes(dinnerTag!.id))).toBe(true);

    const grouped = groupRecipesByCategory(filtered, taxonomy, mealTimeCategory!.id);
    expect(grouped.some((section) => section.label === "Dinner")).toBe(true);
  });
});
