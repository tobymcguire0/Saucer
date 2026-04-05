import { describe, expect, it } from "vitest";

import { parseRecipeMarkdown } from "../src/lib/persistence";
import { filterRecipes, groupRecipesByCategory } from "../src/lib/selectors";
import { createDefaultTaxonomy } from "../src/lib/defaultTaxonomy";
import { createSeedRecipes } from "../src/lib/seedData";

describe("obsidian persistence and recipe selectors", () => {
  it("parses markdown recipes with frontmatter and list sections", () => {
    const recipe = parseRecipeMarkdown(`---
id: "recipe-1"
title: "Test Salad"
summary: "Fresh and crunchy."
sourceType: "manual"
sourceRef: ""
heroImagePath: ""
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

  it("filters and groups recipes by canonical tags", () => {
    const taxonomy = createDefaultTaxonomy();
    const recipes = createSeedRecipes(taxonomy);
    const dinnerTag = taxonomy.tags.find((tag) => tag.name === "Dinner");
    const mealTimeCategory = taxonomy.categories.find((category) => category.name === "Meal-Time");

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
