import { describe, expect, it } from "vitest";

import {
  parseRecipeMarkdown,
  serializeRecipe,
} from "../src/lib/persistence";
import type { Recipe } from "../src/lib/models";
import {
  reconcileRecipeLinks,
  scrubLinksToDeleted,
} from "../src/features/saucer/useSaucerStore";

function makeRecipe(overrides: Partial<Recipe>): Recipe {
  const now = new Date().toISOString();
  return {
    id: "recipe",
    title: "Recipe",
    summary: "",
    sourceType: "manual",
    ingredients: [],
    instructions: [],
    rating: 0,
    tagIds: [],
    linkedRecipeIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("reconcileRecipeLinks", () => {
  it("creates the reverse link on the target", () => {
    const cake = makeRecipe({ id: "cake", title: "Cake", linkedRecipeIds: ["icing"] });
    const icing = makeRecipe({ id: "icing", title: "Icing" });

    const { recipes, touchedIds } = reconcileRecipeLinks([cake, icing], [cake]);

    const updatedIcing = recipes.find((r) => r.id === "icing");
    expect(updatedIcing?.linkedRecipeIds).toEqual(["cake"]);
    expect(touchedIds.has("icing")).toBe(true);
  });

  it("removes stale reverse links when a recipe drops a link", () => {
    const cake = makeRecipe({ id: "cake", title: "Cake", linkedRecipeIds: [] });
    const icing = makeRecipe({ id: "icing", title: "Icing", linkedRecipeIds: ["cake"] });

    const { recipes } = reconcileRecipeLinks([cake, icing], [cake]);

    const updatedIcing = recipes.find((r) => r.id === "icing");
    expect(updatedIcing?.linkedRecipeIds).toEqual([]);
  });

  it("links many recipes bidirectionally when imported together", () => {
    const a = makeRecipe({ id: "a", linkedRecipeIds: ["b", "c"] });
    const b = makeRecipe({ id: "b", linkedRecipeIds: ["a", "c"] });
    const c = makeRecipe({ id: "c", linkedRecipeIds: ["a", "b"] });

    const { recipes } = reconcileRecipeLinks([], [a, b, c]);

    for (const id of ["a", "b", "c"]) {
      const r = recipes.find((rr) => rr.id === id);
      expect(r?.linkedRecipeIds.sort()).toEqual(["a", "b", "c"].filter((x) => x !== id).sort());
    }
  });
});

describe("scrubLinksToDeleted", () => {
  it("removes the deleted id from every other recipe's linkedRecipeIds", () => {
    const a = makeRecipe({ id: "a", linkedRecipeIds: ["b", "c"] });
    const b = makeRecipe({ id: "b", linkedRecipeIds: ["a"] });
    const c = makeRecipe({ id: "c", linkedRecipeIds: ["a"] });

    const { recipes, touchedIds } = scrubLinksToDeleted([a, b, c], "a");

    expect(recipes.find((r) => r.id === "b")?.linkedRecipeIds).toEqual([]);
    expect(recipes.find((r) => r.id === "c")?.linkedRecipeIds).toEqual([]);
    expect(touchedIds.has("b")).toBe(true);
    expect(touchedIds.has("c")).toBe(true);
    expect(touchedIds.has("a")).toBe(false);
  });
});

describe("recipe markdown round-trip with linkedRecipes", () => {
  it("serializes and parses linkedRecipeIds", () => {
    const recipe = makeRecipe({
      id: "recipe-1",
      title: "Cake",
      linkedRecipeIds: ["recipe-2", "recipe-3"],
    });
    const markdown = serializeRecipe(recipe);
    expect(markdown).toContain('linkedRecipes:');
    expect(markdown).toContain('  - "recipe-2"');

    const parsed = parseRecipeMarkdown(markdown);
    expect(parsed.linkedRecipeIds).toEqual(["recipe-2", "recipe-3"]);
  });

  it("defaults legacy markdown without linkedRecipes to an empty array", () => {
    const legacy = `---
id: "recipe-legacy"
title: "Legacy"
summary: ""
sourceType: "manual"
sourceRef: ""
servings: ""
cuisine: ""
mealType: ""
rating: 0
createdAt: "2024-01-01T00:00:00.000Z"
updatedAt: "2024-01-01T00:00:00.000Z"
tags:
---

# Legacy

## Summary


## Ingredients


## Instructions
`;
    const parsed = parseRecipeMarkdown(legacy);
    expect(parsed.linkedRecipeIds).toEqual([]);
  });
});
