import { ValidationError } from "./errors.js";
import type {
  Ingredient,
  Mutation,
  Recipe,
  Taxonomy,
  TaxonomyCategory,
  TaxonomyTag,
} from "./types.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, message: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new ValidationError(message);
  }

  return value;
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(message);
  }

  return value;
}

function requireNonEmptyString(value: unknown, message: string): string {
  const normalized = requireString(value, message).trim();
  if (normalized.length === 0) {
    throw new ValidationError(message);
  }

  return normalized;
}

function parseOptionalRevision(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
    throw new ValidationError("baseRevision must be a non-negative integer when provided.");
  }

  return value;
}

function parseIngredient(value: unknown): Ingredient {
  const ingredient = requireRecord(value, "Each ingredient must be an object.");
  const parsedIngredient: Ingredient = {};

  if ("name" in ingredient && ingredient.name !== undefined) {
    parsedIngredient.name = requireNonEmptyString(
      ingredient.name,
      "Ingredient name must be a string.",
    );
  }

  if ("raw" in ingredient && ingredient.raw !== undefined) {
    parsedIngredient.raw = requireNonEmptyString(
      ingredient.raw,
      "Ingredient raw text must be a string.",
    );
  }

  return parsedIngredient;
}

function parseRecipePatch(value: unknown): Partial<Recipe> & { id: string } {
  const recipe = requireRecord(value, "Recipe mutation payload must be an object.");
  const parsedRecipe: Partial<Recipe> & { id: string } = {
    ...(recipe as Partial<Recipe>),
    id: requireNonEmptyString(recipe.id, "Recipe id is required."),
  };

  if ("title" in recipe && recipe.title !== undefined) {
    parsedRecipe.title = requireString(recipe.title, "Recipe title must be a string.");
  }

  if ("ingredients" in recipe && recipe.ingredients !== undefined) {
    if (!Array.isArray(recipe.ingredients)) {
      throw new ValidationError("Recipe ingredients must be an array.");
    }

    parsedRecipe.ingredients = recipe.ingredients.map(parseIngredient);
  }

  return parsedRecipe;
}

function parseTaxonomyCategory(value: unknown): TaxonomyCategory {
  const category = requireRecord(value, "Each taxonomy category must be an object.");

  return {
    id: requireNonEmptyString(category.id, "Taxonomy category id is required."),
    name: requireNonEmptyString(category.name, "Taxonomy category name is required."),
    description: requireString(
      category.description,
      "Taxonomy category description must be a string.",
    ),
  };
}

function parseTaxonomyTag(value: unknown): TaxonomyTag {
  const tag = requireRecord(value, "Each taxonomy tag must be an object.");

  if (!Array.isArray(tag.aliases)) {
    throw new ValidationError("Taxonomy tag aliases must be an array.");
  }

  return {
    id: requireNonEmptyString(tag.id, "Taxonomy tag id is required."),
    categoryId: requireNonEmptyString(tag.categoryId, "Taxonomy tag categoryId is required."),
    name: requireNonEmptyString(tag.name, "Taxonomy tag name is required."),
    aliases: tag.aliases.map((alias) =>
      requireNonEmptyString(alias, "Taxonomy tag aliases must be strings."),
    ),
  };
}

function parseTaxonomy(value: unknown): Taxonomy {
  const taxonomy = requireRecord(value, "Taxonomy payload must be an object.");

  if (!Array.isArray(taxonomy.categories) || !Array.isArray(taxonomy.tags)) {
    throw new ValidationError("Taxonomy payload must include categories and tags arrays.");
  }

  return {
    categories: taxonomy.categories.map(parseTaxonomyCategory),
    tags: taxonomy.tags.map(parseTaxonomyTag),
  };
}

export function parseCursorParam(value: unknown): string {
  if (value === undefined) {
    return "";
  }

  const cursor = Array.isArray(value) ? value[0] : value;
  const normalized = requireNonEmptyString(cursor, "cursor must be a numeric string.");

  if (!/^\d+$/.test(normalized)) {
    throw new ValidationError("cursor must be a numeric string.");
  }

  return normalized;
}

export function parseRecipeIdParam(value: unknown): string {
  const recipeId = Array.isArray(value) ? value[0] : value;
  return requireNonEmptyString(recipeId, "Recipe id is required.");
}

export function parseMutationsBody(body: unknown): Mutation[] {
  const payload = requireRecord(body, "Request body must be an object.");

  if (!Array.isArray(payload.mutations)) {
    throw new ValidationError("Request body must include a mutations array.");
  }

  return payload.mutations.map((mutation) => {
    const parsedMutation = requireRecord(mutation, "Each mutation must be an object.");
    const type = requireNonEmptyString(parsedMutation.type, "Mutation type is required.");
    const clientMutationId = requireNonEmptyString(
      parsedMutation.clientMutationId,
      "clientMutationId is required.",
    );
    const baseRevision = parseOptionalRevision(parsedMutation.baseRevision);

    if (type === "upsertRecipe") {
      return {
        type,
        clientMutationId,
        recipe: parseRecipePatch(parsedMutation.recipe),
        baseRevision,
      } satisfies Mutation;
    }

    if (type === "deleteRecipe") {
      return {
        type,
        clientMutationId,
        recipeId: requireNonEmptyString(parsedMutation.recipeId, "recipeId is required."),
        baseRevision,
      } satisfies Mutation;
    }

    if (type === "replaceTaxonomy") {
      return {
        type,
        clientMutationId,
        taxonomy: parseTaxonomy(parsedMutation.taxonomy),
        baseRevision,
      } satisfies Mutation;
    }

    throw new ValidationError(`Unsupported mutation type "${type}".`);
  });
}

export function parseTaxonomyBody(body: unknown): {
  taxonomy: Taxonomy;
  baseRevision?: number;
} {
  const payload = requireRecord(body, "Request body must be an object.");
  const taxonomySource =
    Array.isArray(payload.categories) || Array.isArray(payload.tags) ? payload : payload.taxonomy;

  return {
    taxonomy: parseTaxonomy(taxonomySource),
    baseRevision: parseOptionalRevision(payload.baseRevision),
  };
}

export function parseWebsiteImportUrl(body: unknown): string {
  const payload = requireRecord(body, "Request body must be an object.");
  const rawUrl = requireNonEmptyString(payload.url, "A valid http(s) URL is required.");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new ValidationError("A valid http(s) URL is required.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new ValidationError("A valid http(s) URL is required.");
  }

  return parsedUrl.toString();
}
