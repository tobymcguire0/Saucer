import { describe, expect, it } from "vitest";

import type { Recipe } from "../src/lib/models";
import { parseRecipeMarkdown, serializeRecipe } from "../src/lib/persistence";
import {
  buildRecipeSteps,
  detectIngredientUsages,
  parseStepLine,
  serializeStepLine,
} from "../src/lib/recipeSteps";
import { convertDraftToRecipe } from "../src/lib/taxonomy";

function makeRecipeWithSteps(): Recipe {
  const now = new Date().toISOString();
  // IDs match `${recipeId}-${slugify(raw)}` because that's how parseRecipeMarkdown rebuilds them.
  const butterId = "recipe-butter-pasta-1-2-lb-butter";
  const pastaId = "recipe-butter-pasta-300g-pasta";
  return {
    id: "recipe-butter-pasta",
    title: "Butter Pasta",
    summary: "Quick pasta.",
    sourceType: "manual",
    ingredients: [
      { id: butterId, name: "Butter", raw: "1/2 lb butter" },
      { id: pastaId, name: "Pasta", raw: "300g pasta" },
    ],
    instructions: [
      {
        id: "step-1",
        text: "Boil the pasta.",
        ingredientUsages: [{ ingredientId: pastaId }],
      },
      {
        id: "step-2",
        text: "Mix in all butter.",
        ingredientUsages: [{ ingredientId: butterId, qty: "half" }],
      },
    ],
    rating: 0,
    tagIds: [],
    linkedRecipeIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe("recipe step ingredient mapping", () => {
  it("detects ingredients referenced in instruction text", () => {
    const usages = detectIngredientUsages("Mix in all butter and stir gently.", [
      { id: "ing-butter", name: "Butter", raw: "1/2 lb butter" },
      { id: "ing-flour", name: "Flour", raw: "2 cups flour" },
    ]);
    expect(usages.map((u) => u.ingredientId)).toEqual(["ing-butter"]);
  });

  it("ignores stop words and measurement-only tokens when matching", () => {
    const usages = detectIngredientUsages("Add a cup of water.", [
      { id: "ing-cup", name: "cup", raw: "cup" },
    ]);
    expect(usages).toEqual([]);
  });

  it("round-trips step ingredient usages through markdown", () => {
    const recipe = makeRecipeWithSteps();
    const markdown = serializeRecipe(recipe);
    expect(markdown).toContain("<!-- uses: recipe-butter-pasta-300g-pasta -->");
    expect(markdown).toContain("<!-- uses: recipe-butter-pasta-1-2-lb-butter:half -->");

    const parsed = parseRecipeMarkdown(markdown);
    expect(parsed.instructions).toHaveLength(2);
    expect(parsed.instructions[0].text).toBe("Boil the pasta.");
    expect(parsed.instructions[0].ingredientUsages[0].ingredientId).toBe(
      "recipe-butter-pasta-300g-pasta",
    );
    expect(parsed.instructions[1].ingredientUsages[0]).toEqual({
      ingredientId: "recipe-butter-pasta-1-2-lb-butter",
      qty: "half",
    });
  });

  it("falls back to heuristic mapping for legacy markdown without uses annotations", () => {
    const legacy = `---
id: "recipe-legacy"
title: "Legacy Pasta"
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

## Ingredients
- 1/2 lb butter
- 300g pasta

## Instructions
1. Boil the pasta.
2. Mix in all butter.
`;
    const parsed = parseRecipeMarkdown(legacy);
    expect(parsed.instructions).toHaveLength(2);
    const ingredientIds = parsed.ingredients.map((ing) => ing.id);
    expect(parsed.instructions[0].ingredientUsages.length).toBeGreaterThan(0);
    expect(ingredientIds).toContain(parsed.instructions[0].ingredientUsages[0].ingredientId);
    expect(
      parsed.instructions[1].ingredientUsages.some((u) => u.ingredientId.includes("butter")),
    ).toBe(true);
  });

  it("converts a draft with explicit stepIngredientMap into RecipeStep[] with linked usages", () => {
    const recipe = convertDraftToRecipe({
      title: "Mapped",
      summary: "",
      sourceType: "manual",
      sourceRef: "",
      ingredientsText: "1/2 lb butter\n300g pasta",
      instructionsText: "1. Boil the pasta.\n2. Mix in butter.",
      servings: "",
      cuisine: "",
      mealType: "",
      selectedTagIds: [],
      selectedLinkedRecipeIds: [],
      stepIngredientMap: { 0: [1], 1: [0] },
    });
    expect(recipe.instructions[0].ingredientUsages[0].ingredientId).toBe(recipe.ingredients[1].id);
    expect(recipe.instructions[1].ingredientUsages[0].ingredientId).toBe(recipe.ingredients[0].id);
  });

  it("parses serialized step lines back into structured usages", () => {
    const step = {
      id: "x",
      text: "Mix it.",
      ingredientUsages: [{ ingredientId: "ing-1" }, { ingredientId: "ing-2", qty: "half" }],
    };
    const serialized = serializeStepLine(step, 0);
    expect(serialized).toBe("1. Mix it. <!-- uses: ing-1, ing-2:half -->");
    const parsed = parseStepLine(serialized);
    expect(parsed.text).toBe("Mix it.");
    expect(parsed.ingredientUsages).toEqual([
      { ingredientId: "ing-1" },
      { ingredientId: "ing-2", qty: "half" },
    ]);
  });

  it("builds steps with stable ids derived from recipe id and index", () => {
    const steps = buildRecipeSteps(
      "recipe-x",
      ["Cook things.", "Plate things."],
      [{ id: "ing-x", name: "x", raw: "x" }],
    );
    expect(steps).toHaveLength(2);
    expect(steps[0].id.startsWith("recipe-x-step-1")).toBe(true);
    expect(steps[1].id.startsWith("recipe-x-step-2")).toBe(true);
  });
});
