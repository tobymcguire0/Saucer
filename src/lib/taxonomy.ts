import { createDefaultTaxonomy, slugify } from "./defaultTaxonomy";
import type {
  Category,
  Ingredient,
  Recipe,
  RecipeDraft,
  Tag,
  TagSuggestion,
  Taxonomy,
} from "./models";

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function coerceText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => coerceText(entry)).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return coerceText(record.text) || coerceText(record.name) || "";
  }

  return "";
}

// Strips measurement units and applies naive suffix singularization so that
// "tomatoes" and "tomato" hash to the same term for tag matching.
export function normalizeTerm(value: unknown) {
  const normalized = normalizeWhitespace(coerceText(value))
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\bcloves?\b/g, "")
    .replace(/\btablespoons?\b|\btsp\b|\bteaspoons?\b|\bcups?\b|\bg\b|\bkg\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.endsWith("ies")) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith("es")) {
    return normalized.slice(0, -2);
  }

  if (normalized.endsWith("s") && normalized.length > 3) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from<number>({ length: b.length + 1 }).fill(0),
  );

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarity(a: string, b: string) {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);
  const ratio = 1 - distance / maxLength;
  // Substring containment gets a flat 0.9 floor so short tokens embedded in longer ones
  // (e.g. "egg" in "scrambled egg") score higher than pure edit-distance would give them.
  const overlap = a.includes(b) || b.includes(a) ? 0.9 : 0;
  return Math.max(ratio, overlap);
}

export interface TaxonomyTagMatch {
  tag: Tag;
  score: number;
  matchedTerm: string;
  matchedAlias?: string;
  matchType: "exact" | "prefix" | "substring" | "alias" | "fuzzy";
}

export function getCategoryByName(taxonomy: Taxonomy, name: string) {
  return taxonomy.categories.find((category) => category.name === name);
}

export function searchTags(
  taxonomy: Taxonomy,
  input: string,
  limit = 8,
): TaxonomyTagMatch[] {
  const normalizedInput = normalizeTerm(input);
  if (!normalizedInput) {
    return [];
  }
  const matches: TaxonomyTagMatch[] = [];

  for (const tag of taxonomy.tags) {
    const normalizedName = normalizeTerm(tag.name);
    const candidates = [tag.name, ...tag.aliases];
    let bestMatch: TaxonomyTagMatch | undefined;

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeTerm(candidate);
      if (!normalizedCandidate) {
        continue;
      }

      let score = 0;
      let matchType: TaxonomyTagMatch["matchType"] | undefined;

      if (normalizedCandidate === normalizedInput) {
        score = candidate === tag.name ? 1 : 0.99;
        matchType = "exact";
      } else if (normalizedCandidate.startsWith(normalizedInput)) {
        score = candidate === tag.name ? 0.97 : 0.95;
        matchType = "prefix";
      } else if (normalizedCandidate.includes(normalizedInput)) {
        score = candidate === tag.name ? 0.92 : 0.9;
        matchType = candidate === tag.name ? "substring" : "alias";
      } else {
        const fuzzyScore = similarity(normalizedInput, normalizedCandidate);
        if (fuzzyScore >= 0.72) {
          score = fuzzyScore;
          matchType = "fuzzy";
        }
      }

      if (!matchType || score <= 0) {
        continue;
      }

      const nextMatch: TaxonomyTagMatch = {
        tag,
        score,
        matchedTerm: candidate,
        matchedAlias: candidate === tag.name ? undefined : candidate,
        matchType,
      };

      if (!bestMatch || nextMatch.score > bestMatch.score) {
        bestMatch = nextMatch;
      }
    }

    if (bestMatch) {
      if (
        bestMatch.matchType === "fuzzy" &&
        !normalizedName.includes(normalizedInput) &&
        !tag.aliases.some((alias) => normalizeTerm(alias).includes(normalizedInput))
      ) {
        bestMatch.score = Math.min(bestMatch.score, 0.82);
      }

      matches.push(bestMatch);
    }
  }

  return matches
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.tag.name.localeCompare(right.tag.name);
    })
    .slice(0, limit);

}

export function searchTagsInCategory(
  taxonomy: Taxonomy,
  categoryId: string,
  input: string,
  limit = 8,
): TaxonomyTagMatch[] {
  const normalizedInput = normalizeTerm(input);
  if (!normalizedInput) {
    return [];
  }

  const matches: TaxonomyTagMatch[] = [];

  for (const tag of taxonomy.tags) {
    if (tag.categoryId !== categoryId) {
      continue;
    }

    const normalizedName = normalizeTerm(tag.name);
    const candidates = [tag.name, ...tag.aliases];
    let bestMatch: TaxonomyTagMatch | undefined;

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeTerm(candidate);
      if (!normalizedCandidate) {
        continue;
      }

      let score = 0;
      let matchType: TaxonomyTagMatch["matchType"] | undefined;

      if (normalizedCandidate === normalizedInput) {
        score = candidate === tag.name ? 1 : 0.99;
        matchType = "exact";
      } else if (normalizedCandidate.startsWith(normalizedInput)) {
        score = candidate === tag.name ? 0.97 : 0.95;
        matchType = "prefix";
      } else if (normalizedCandidate.includes(normalizedInput)) {
        score = candidate === tag.name ? 0.92 : 0.9;
        matchType = candidate === tag.name ? "substring" : "alias";
      } else {
        const fuzzyScore = similarity(normalizedInput, normalizedCandidate);
        if (fuzzyScore >= 0.72) {
          score = fuzzyScore;
          matchType = "fuzzy";
        }
      }

      if (!matchType || score <= 0) {
        continue;
      }

      const nextMatch: TaxonomyTagMatch = {
        tag,
        score,
        matchedTerm: candidate,
        matchedAlias: candidate === tag.name ? undefined : candidate,
        matchType,
      };

      if (!bestMatch || nextMatch.score > bestMatch.score) {
        bestMatch = nextMatch;
      }
    }

    if (bestMatch) {
      if (
        bestMatch.matchType === "fuzzy" &&
        !normalizedName.includes(normalizedInput) &&
        !tag.aliases.some((alias) => normalizeTerm(alias).includes(normalizedInput))
      ) {
        bestMatch.score = Math.min(bestMatch.score, 0.82);
      }

      matches.push(bestMatch);
    }
  }

  return matches
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.tag.name.localeCompare(right.tag.name);
    })
    .slice(0, limit);
}

function resolveAgainstTags(term: string, tags: Tag[]) {
  const normalized = normalizeTerm(term);
  const exact = tags.find((tag) => normalizeTerm(tag.name) === normalized);
  if (exact) {
    return {
      input: term,
      normalized,
      categoryId: exact.categoryId,
      status: "exact" as const,
      confidence: 1,
      tagId: exact.id,
      matchedName: exact.name,
    };
  }

  const aliasMatch = tags.find((tag) =>
    tag.aliases.some((alias) => normalizeTerm(alias) === normalized),
  );

  if (aliasMatch) {
    return {
      input: term,
      normalized,
      categoryId: aliasMatch.categoryId,
      status: "alias" as const,
      confidence: 0.94,
      tagId: aliasMatch.id,
      matchedName: aliasMatch.name,
    };
  }

  let bestMatch: Tag | undefined;
  let bestScore = 0;
  for (const tag of tags) {
    const candidates = [tag.name, ...tag.aliases];
    for (const candidate of candidates) {
      const score = similarity(normalized, normalizeTerm(candidate));
      if (score > bestScore) {
        bestScore = score;
        bestMatch = tag;
      }
    }
  }

  if (bestMatch && bestScore >= 0.76) {
    return {
      input: term,
      normalized,
      categoryId: bestMatch.categoryId,
      status: "fuzzy" as const,
      confidence: Number(bestScore.toFixed(2)),
      tagId: bestMatch.id,
      matchedName: bestMatch.name,
    };
  }

  return {
    input: term,
    normalized,
    categoryId: "",
    status: "new" as const,
    confidence: 0.3,
  };
}

export function resolveTagSuggestion(
  term: string,
  taxonomy: Taxonomy,
  categoryId?: string,
): TagSuggestion {
  const scopedTags = categoryId
    ? taxonomy.tags.filter((tag) => tag.categoryId === categoryId)
    : taxonomy.tags;

  const resolved = resolveAgainstTags(term, scopedTags);
  return categoryId ? { ...resolved, categoryId } : resolved;
}

function collectInstructionKeywords(recipe: Pick<RecipeDraft, "instructionsText"> | Recipe) {
  const instructionsText =
    "instructionsText" in recipe
      ? recipe.instructionsText
      : recipe.instructions.join(" ");

  const normalized = normalizeTerm(instructionsText);
  const values: Array<{ categoryName: string; term: string }> = [];

  const keywordMap = [
    { categoryName: "Cooking-Method", tokens: ["bake", "baked"], tag: "Baked" },
    { categoryName: "Cooking-Method", tokens: ["fry", "fried"], tag: "Fried" },
    { categoryName: "Cooking-Method", tokens: ["roast", "roasted"], tag: "Roasted" },
    { categoryName: "Cooking-Method", tokens: ["grill", "grilled"], tag: "Grilled" },
    { categoryName: "Cooking-Method", tokens: ["stew", "braise"], tag: "Stewed" },
    { categoryName: "Equipment", tokens: ["oven"], tag: "Oven" },
    { categoryName: "Equipment", tokens: ["skillet", "pan"], tag: "Stovetop" },
    { categoryName: "Equipment", tokens: ["air fryer"], tag: "Air Fryer" },
    { categoryName: "Equipment", tokens: ["slow cooker", "crockpot"], tag: "Slow Cooker" },
    { categoryName: "Equipment", tokens: ["blend", "blender"], tag: "Blender" },
    { categoryName: "Flavor", tokens: ["spicy", "chili", "chilli"], tag: "Spicy" },
    { categoryName: "Flavor", tokens: ["sweet"], tag: "Sweet" },
    { categoryName: "Flavor", tokens: ["creamy"], tag: "Creamy" },
    { categoryName: "Flavor", tokens: ["savory"], tag: "Savory" },
    { categoryName: "Flavor", tokens: ["tangy", "zesty"], tag: "Tangy" },
  ];

  for (const entry of keywordMap) {
    if (entry.tokens.some((token) => normalized.includes(token))) {
      values.push({ categoryName: entry.categoryName, term: entry.tag });
    }
  }

  return values;
}

function deriveDietaryTags(ingredients: Ingredient[]) {
  const normalizedIngredients = ingredients.map((ingredient) =>
    normalizeTerm(ingredient.name || ingredient.raw),
  );
  const containsMeat = normalizedIngredients.some((ingredient) =>
    ["chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp", "prawn"].some((token) =>
      ingredient.includes(token),
    ),
  );
  const containsDairy = normalizedIngredients.some((ingredient) =>
    ["milk", "cream", "butter", "cheese", "yogurt"].some((token) => ingredient.includes(token)),
  );
  const containsEgg = normalizedIngredients.some((ingredient) => ingredient.includes("egg"));
  const tags: string[] = [];

  if (!containsMeat) {
    tags.push("Vegetarian");
  }

  if (!containsMeat && !containsDairy && !containsEgg) {
    tags.push("Vegan", "Dairy-Free");
  }

  if (!normalizedIngredients.some((ingredient) => ingredient.includes("nut"))) {
    tags.push("Nut-Free");
  }

  if (normalizedIngredients.some((ingredient) => ingredient.includes("tofu"))) {
    tags.push("High-Protein");
  }

  return tags;
}

export function buildTagSuggestions(
  recipeLike: Pick<
    RecipeDraft,
    "mealType" | "cuisine" | "ingredientsText" | "instructionsText" | "title" | "summary"
  > & { ingredients?: Ingredient[] },
  taxonomy: Taxonomy,
) {
  const title = coerceText(recipeLike.title);
  const summary = coerceText(recipeLike.summary);
  const mealType = coerceText(recipeLike.mealType);
  const cuisine = coerceText(recipeLike.cuisine);
  const ingredientsText = coerceText(recipeLike.ingredientsText);
  const instructionsText = coerceText(recipeLike.instructionsText);
  const suggestions: TagSuggestion[] = [];
  const categories = new Map(taxonomy.categories.map((category) => [category.name, category]));
  const ingredientLines =
    recipeLike.ingredients ??
    ingredientsText
      .split(/\r?\n/)
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => ({ id: raw, name: raw, raw }));

  const directCandidates: Array<{ term: string; categoryName: string }> = [];

  if (mealType) {
    directCandidates.push({ term: mealType, categoryName: "Meal-Time" });
  }
  if (cuisine) {
    directCandidates.push({ term: cuisine, categoryName: "Cuisine" });
  }

  for (const ingredient of ingredientLines) {
    directCandidates.push({
      term: ingredient.name || ingredient.raw,
      categoryName: "Ingredients",
    });
    directCandidates.push({
      term: ingredient.name || ingredient.raw,
      categoryName: "Protein",
    });
  }

  directCandidates.push(...collectInstructionKeywords(recipeLike));
  deriveDietaryTags(ingredientLines).forEach((term) =>
    directCandidates.push({ term, categoryName: "Dietary" }),
  );

  const titleSummary = normalizeTerm(`${title} ${summary}`);
  if (titleSummary.includes("soup")) {
    directCandidates.push({ term: "Soup", categoryName: "Course" });
  } else if (titleSummary.includes("salad")) {
    directCandidates.push({ term: "Salad", categoryName: "Course" });
  } else if (mealType.toLowerCase() === "dessert") {
    directCandidates.push({ term: "Dessert", categoryName: "Course" });
  } else {
    directCandidates.push({ term: "Main", categoryName: "Course" });
  }

  // Difficulty heuristic: proxy ingredient count as a rough complexity signal.
  if (ingredientLines.length <= 7) {
    directCandidates.push({ term: "Easy", categoryName: "Difficulty" });
  } else if (ingredientLines.length <= 12) {
    directCandidates.push({ term: "Medium", categoryName: "Difficulty" });
  } else {
    directCandidates.push({ term: "Hard", categoryName: "Difficulty" });
  }

  // Time heuristic: 5 or fewer instruction steps is treated as Quick.
  if (instructionsText.split(/\r?\n/).length <= 5) {
    directCandidates.push({ term: "Quick", categoryName: "Time" });
  } else {
    directCandidates.push({ term: "30-Min", categoryName: "Time" });
  }

  for (const candidate of directCandidates) {
    const category = categories.get(candidate.categoryName);
    if (!category || !candidate.term) {
      continue;
    }
    const match = resolveTagSuggestion(candidate.term, taxonomy, category.id);
    suggestions.push({ ...match, categoryId: category.id });
  }

  const unique = new Map<string, TagSuggestion>();
  for (const suggestion of suggestions) {
    const key = `${suggestion.categoryId}:${suggestion.tagId ?? suggestion.normalized}`;
    const existing = unique.get(key);
    if (!existing || existing.confidence < suggestion.confidence) {
      unique.set(key, suggestion);
    }
  }

  return [...unique.values()].sort((left, right) => right.confidence - left.confidence);
}

export const draftSuggestionConfidenceThreshold = 0.5;

export function filterDraftSuggestionsByConfidence(
  suggestions: TagSuggestion[],
  minimumConfidence = draftSuggestionConfidenceThreshold,
) {
  return suggestions.filter(
    (suggestion) => Boolean(suggestion.tagId) && suggestion.confidence >= minimumConfidence,
  );
}

export function getAutoSelectedDraftTagIds(
  suggestions: TagSuggestion[],
  minimumConfidence = draftSuggestionConfidenceThreshold,
) {
  return filterDraftSuggestionsByConfidence(suggestions, minimumConfidence)
    .map((suggestion) => suggestion.tagId)
    .filter((tagId): tagId is string => Boolean(tagId));
}

export function getVisibleDraftTagIds(
  selectedTagIds: string[],
  suggestions: TagSuggestion[],
  minimumConfidence = draftSuggestionConfidenceThreshold,
) {
  return [
    ...new Set([...selectedTagIds, ...getAutoSelectedDraftTagIds(suggestions, minimumConfidence)]),
  ];
}

export function convertDraftToRecipe(draft: RecipeDraft) {
  const now = new Date().toISOString();
  const recipeId = draft.id ?? `recipe-${crypto.randomUUID()}`;
  const ingredients = draft.ingredientsText
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => ({
      id: `${recipeId}-${slugify(raw) || crypto.randomUUID()}`,
      name: raw.replace(/^[-*]\s*/, ""),
      raw,
    }));

  const instructions = draft.instructionsText
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean)
    .map((step) => step.replace(/^\d+[.)]\s*/, ""));

  return {
    id: recipeId,
    title: draft.title.trim() || "Untitled recipe",
    summary: draft.summary.trim(),
    sourceType: draft.sourceType,
    sourceRef: draft.sourceRef.trim() || undefined,
    heroImage: draft.heroImage,
    ingredients,
    instructions,
    servings: draft.servings.trim() || undefined,
    cuisine: draft.cuisine.trim() || undefined,
    mealType: draft.mealType.trim() || undefined,
    rating: 0,
    tagIds: [...new Set(draft.selectedTagIds)],
    linkedRecipeIds: [...new Set(draft.selectedLinkedRecipeIds ?? [])],
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyDraft(sourceType: RecipeDraft["sourceType"] = "manual"): RecipeDraft {
  return {
    title: "",
    summary: "",
    sourceType,
    sourceRef: "",
    heroImage: undefined,
    ingredientsText: "",
    instructionsText: "",
    servings: "",
    cuisine: "",
    mealType: "",
    selectedTagIds: [],
    selectedLinkedRecipeIds: [],
  };
}

export function ensureDefaultTaxonomy(taxonomy?: Taxonomy) {
  return taxonomy && taxonomy.categories.length > 0 ? taxonomy : createDefaultTaxonomy();
}

export function upsertCategory(taxonomy: Taxonomy, categoryName: string, description: string) {
  const normalizedName = normalizeWhitespace(categoryName);
  if (!normalizedName) {
    return taxonomy;
  }

  const existing = taxonomy.categories.find(
    (category) => normalizeTerm(category.name) === normalizeTerm(normalizedName),
  );

  if (existing) {
    return {
      ...taxonomy,
      categories: taxonomy.categories.map((category) =>
        category.id === existing.id ? { ...category, description: description.trim() || category.description } : category,
      ),
    };
  }

  const category: Category = {
    id: `category-${slugify(normalizedName)}`,
    name: normalizedName,
    description: description.trim() || "Custom recipe category.",
  };

  return {
    ...taxonomy,
    categories: [...taxonomy.categories, category],
  };
}

export function upsertTag(
  taxonomy: Taxonomy,
  categoryId: string,
  tagName: string,
  description = "",
) {
  const normalizedName = normalizeWhitespace(tagName);
  if (!normalizedName) {
    return taxonomy;
  }

  const existing = taxonomy.tags.find(
    (tag) =>
      tag.categoryId === categoryId &&
      normalizeTerm(tag.name) === normalizeTerm(normalizedName),
  );

  if (existing) {
    return {
      ...taxonomy,
      tags: taxonomy.tags.map((tag) =>
        tag.id === existing.id ? { ...tag, description: description || tag.description } : tag,
      ),
    };
  }

  const tag: Tag = {
    id: `tag-${slugify(categoryId)}-${slugify(normalizedName)}`,
    categoryId,
    name: normalizedName,
    description: description || undefined,
    aliases: [],
  };

  return {
    ...taxonomy,
    tags: [...taxonomy.tags, tag],
  };
}

export function addAlias(taxonomy: Taxonomy, tagId: string, alias: string) {
  const normalizedAlias = normalizeWhitespace(alias);
  if (!normalizedAlias) {
    return taxonomy;
  }

  return {
    ...taxonomy,
    tags: taxonomy.tags.map((tag) =>
      tag.id === tagId && !tag.aliases.some((entry) => normalizeTerm(entry) === normalizeTerm(normalizedAlias))
        ? { ...tag, aliases: [...tag.aliases, normalizedAlias] }
        : tag,
    ),
  };
}

export function mergeTags(
  taxonomy: Taxonomy,
  recipes: Recipe[],
  sourceTagId: string,
  targetTagId: string,
) {
  if (!sourceTagId || !targetTagId || sourceTagId === targetTagId) {
    return { taxonomy, recipes };
  }

  const sourceTag = taxonomy.tags.find((tag) => tag.id === sourceTagId);
  const targetTag = taxonomy.tags.find((tag) => tag.id === targetTagId);

  if (!sourceTag || !targetTag || sourceTag.categoryId !== targetTag.categoryId) {
    return { taxonomy, recipes };
  }

  const mergedTaxonomy: Taxonomy = {
    ...taxonomy,
    tags: taxonomy.tags
      .filter((tag) => tag.id !== sourceTagId)
      .map((tag) =>
        tag.id === targetTagId
          ? {
              ...tag,
              aliases: [...new Set([...tag.aliases, sourceTag.name, ...sourceTag.aliases])],
            }
          : tag,
      ),
  };

  const mergedRecipes = recipes.map((recipe) => ({
    ...recipe,
    tagIds: recipe.tagIds.includes(sourceTagId)
      ? [...new Set(recipe.tagIds.filter((tagId) => tagId !== sourceTagId).concat(targetTagId))]
      : recipe.tagIds,
  }));

  return { taxonomy: mergedTaxonomy, recipes: mergedRecipes };
}
