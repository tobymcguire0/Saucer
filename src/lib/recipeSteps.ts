import { slugify } from "./defaultTaxonomy";
import type { Ingredient, IngredientUsage, RecipeStep } from "./models";

// Stop words that should not count as ingredient evidence on their own.
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "with",
  "in",
  "to",
  "for",
  "on",
  "into",
  "until",
  "then",
  "add",
  "mix",
  "stir",
  "cook",
  "all",
  "your",
  "some",
  "few",
  "more",
  "less",
  "very",
  "from",
  "by",
  "is",
  "are",
  "be",
  "it",
]);

const MEASUREMENT_TOKENS = new Set([
  "cup",
  "cups",
  "tsp",
  "tbsp",
  "teaspoon",
  "teaspoons",
  "tablespoon",
  "tablespoons",
  "g",
  "gram",
  "grams",
  "kg",
  "ml",
  "l",
  "oz",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "ounce",
  "ounces",
  "pinch",
  "dash",
  "clove",
  "cloves",
  "can",
  "cans",
  "slice",
  "slices",
  "piece",
  "pieces",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function singularize(token: string) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter(Boolean)
    .map(singularize)
    .filter(
      (token) =>
        token.length >= 3 && !STOP_WORDS.has(token) && !MEASUREMENT_TOKENS.has(token) && !/^\d+$/.test(token),
    );
}

// Pulls the ingredient "core" name out of a raw line like "1/2 lb unsalted butter"
// by skipping leading numerics, fractions, and measurement words.
function deriveIngredientCore(ingredient: Ingredient): string {
  const source = ingredient.name || ingredient.raw;
  const tokens = normalize(source)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !/^\d+([./]\d+)?$/.test(token))
    .filter((token) => !MEASUREMENT_TOKENS.has(singularize(token)));
  return tokens.join(" ").trim() || source;
}

export function detectIngredientUsages(
  instructionText: string,
  ingredients: Ingredient[],
): IngredientUsage[] {
  if (!instructionText.trim() || ingredients.length === 0) {
    return [];
  }
  const instructionTokens = new Set(tokenize(instructionText));
  if (instructionTokens.size === 0) {
    return [];
  }

  const usages: IngredientUsage[] = [];
  const matched = new Set<string>();

  for (const ingredient of ingredients) {
    if (matched.has(ingredient.id)) {
      continue;
    }
    const core = deriveIngredientCore(ingredient);
    const ingredientTokens = tokenize(core);
    if (ingredientTokens.length === 0) {
      continue;
    }
    const hit = ingredientTokens.some((token) => instructionTokens.has(token));
    if (hit) {
      usages.push({ ingredientId: ingredient.id });
      matched.add(ingredient.id);
    }
  }

  return usages;
}

export function buildStepId(recipeId: string, index: number, text: string) {
  const base = slugify(text).slice(0, 32) || "step";
  return `${recipeId}-step-${index + 1}-${base}`;
}

export function buildRecipeSteps(
  recipeId: string,
  instructionTexts: string[],
  ingredients: Ingredient[],
  explicitMap?: Record<number, IngredientUsage[]>,
): RecipeStep[] {
  return instructionTexts.map((text, index) => {
    const explicit = explicitMap?.[index];
    const usages = explicit && explicit.length > 0 ? explicit : detectIngredientUsages(text, ingredients);
    return {
      id: buildStepId(recipeId, index, text),
      text,
      ingredientUsages: usages,
    };
  });
}

export function legacyInstructionsToSteps(
  recipeId: string,
  legacy: string[] | RecipeStep[],
  ingredients: Ingredient[],
): RecipeStep[] {
  if (!Array.isArray(legacy)) {
    return [];
  }
  if (legacy.length === 0) {
    return [];
  }
  // Already in step shape.
  if (typeof legacy[0] === "object" && legacy[0] !== null && "text" in legacy[0]) {
    return (legacy as RecipeStep[]).map((step, index) => ({
      id: step.id || buildStepId(recipeId, index, step.text),
      text: step.text,
      ingredientUsages:
        Array.isArray(step.ingredientUsages) && step.ingredientUsages.length > 0
          ? step.ingredientUsages
          : detectIngredientUsages(step.text, ingredients),
    }));
  }
  return buildRecipeSteps(recipeId, legacy as string[], ingredients);
}

const STEP_USES_PATTERN = /\s*<!--\s*uses:\s*([^>]*?)\s*-->\s*$/;

export function parseStepLine(line: string): {
  text: string;
  ingredientUsages: IngredientUsage[];
} {
  const stripped = line.replace(/^\d+[.)]\s*/, "");
  const match = stripped.match(STEP_USES_PATTERN);
  if (!match) {
    return { text: stripped.trim(), ingredientUsages: [] };
  }
  const text = stripped.slice(0, match.index).trim();
  const payload = match[1].trim();
  if (!payload) {
    return { text, ingredientUsages: [] };
  }
  const usages: IngredientUsage[] = payload
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [ingredientId, qty] = entry.split(":").map((part) => part.trim());
      return qty ? { ingredientId, qty } : { ingredientId };
    });
  return { text, ingredientUsages: usages };
}

export function serializeStepLine(step: RecipeStep, index: number): string {
  const base = `${index + 1}. ${step.text}`;
  if (!step.ingredientUsages || step.ingredientUsages.length === 0) {
    return base;
  }
  const payload = step.ingredientUsages
    .map((usage) => (usage.qty ? `${usage.ingredientId}:${usage.qty}` : usage.ingredientId))
    .join(", ");
  return `${base} <!-- uses: ${payload} -->`;
}

export function stepIngredientMapFromSteps(
  steps: RecipeStep[],
  ingredients: Ingredient[],
): Record<number, number[]> {
  const ingredientIndexById = new Map(ingredients.map((ing, idx) => [ing.id, idx] as const));
  const map: Record<number, number[]> = {};
  steps.forEach((step, stepIndex) => {
    const indices = step.ingredientUsages
      .map((usage) => ingredientIndexById.get(usage.ingredientId))
      .filter((idx): idx is number => idx !== undefined);
    if (indices.length > 0) {
      map[stepIndex] = indices;
    }
  });
  return map;
}
