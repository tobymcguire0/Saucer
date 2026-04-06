import { describe, expect, it } from "vitest";

import { createDefaultTaxonomy } from "../src/lib/defaultTaxonomy";
import type { Recipe } from "../src/lib/models";
import { resolveTagSuggestion, upsertCategory, upsertTag, addAlias, mergeTags } from "../src/lib/taxonomy";

describe("taxonomy matching", () => {
  it("maps alias and misspelling inputs back to canonical tags", () => {
    const taxonomy = createDefaultTaxonomy();
    const ingredientsCategory = taxonomy.categories.find((category) => category.name === "Ingredients");

    expect(ingredientsCategory).toBeTruthy();

    const spaghetti = resolveTagSuggestion("spaghetti", taxonomy, ingredientsCategory?.id);
    const sphagetti = resolveTagSuggestion("sphagetti", taxonomy, ingredientsCategory?.id);

    expect(spaghetti.matchedName).toBe("Pasta");
    expect(sphagetti.matchedName).toBe("Pasta");
    expect(spaghetti.tagId).toBe(sphagetti.tagId);
  });

  it("supports user-created categories, tags, and aliases", () => {
    let taxonomy = createDefaultTaxonomy();
    taxonomy = upsertCategory(taxonomy, "Season", "Weather-friendly recipes");
    const seasonCategory = taxonomy.categories.find((category) => category.name === "Season");

    expect(seasonCategory).toBeTruthy();

    taxonomy = upsertTag(taxonomy, seasonCategory!.id, "Summer");
    const summerTag = taxonomy.tags.find((tag) => tag.name === "Summer");
    expect(summerTag).toBeTruthy();

    taxonomy = addAlias(taxonomy, summerTag!.id, "hot weather");
    expect(taxonomy.tags.find((tag) => tag.id === summerTag!.id)?.aliases).toContain("hot weather");
  });

  it("merges source tags into target tags and rewrites recipe assignments", () => {
    const taxonomy = createDefaultTaxonomy();
    const dinnerTag = taxonomy.tags.find((tag) => tag.name === "Dinner");
    const lunchTag = taxonomy.tags.find((tag) => tag.name === "Lunch");
    const now = new Date().toISOString();
    const recipes: Recipe[] = [
      {
        id: "recipe-lunch",
        title: "Lunch Plate",
        summary: "Simple lunch recipe.",
        sourceType: "manual",
        ingredients: [{ id: "ingredient-1", name: "Bread", raw: "2 slices bread" }],
        instructions: ["Toast the bread."],
        servings: "1",
        cuisine: "American",
        mealType: "Lunch",
        rating: 0,
        tagIds: [lunchTag?.id ?? ""].filter(Boolean),
        createdAt: now,
        updatedAt: now,
      },
    ];

    expect(dinnerTag).toBeTruthy();
    expect(lunchTag).toBeTruthy();

    const merged = mergeTags(taxonomy, recipes, lunchTag!.id, dinnerTag!.id);

    expect(merged.taxonomy.tags.some((tag) => tag.id === lunchTag!.id)).toBe(false);
    expect(merged.taxonomy.tags.find((tag) => tag.id === dinnerTag!.id)?.aliases).toContain("Lunch");
  });
});
