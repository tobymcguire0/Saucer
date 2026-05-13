import { createDefaultTaxonomy, slugify } from "../defaultTaxonomy";
import type { AppSnapshot, Recipe, Taxonomy } from "../models";
import { isSourceType } from "../typeGuards";

export interface VaultSnapshot {
  recipeFiles: Record<string, string>;
  attachments: Record<string, string>;
  taxonomy?: Taxonomy;
}

export interface RecipeStore {
  load(): Promise<AppSnapshot>;
  saveRecipe(recipe: Recipe): Promise<AppSnapshot>;
  deleteRecipe(recipeId: string): Promise<AppSnapshot>;
  saveTaxonomy(taxonomy: Taxonomy): Promise<AppSnapshot>;
  replaceAll(recipes: Recipe[], taxonomy: Taxonomy): Promise<AppSnapshot>;
}

export function canUseTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// JSON.stringify produces a quoted, escaped string safe for YAML frontmatter
// (handles colons, quotes, and other YAML-unsafe characters in recipe fields).
function escapeFrontmatter(value: string) {
  return JSON.stringify(value);
}

export function serializeRecipe(recipe: Recipe) {
  const frontmatter = [
    "---",
    `id: ${escapeFrontmatter(recipe.id)}`,
    `title: ${escapeFrontmatter(recipe.title)}`,
    `summary: ${escapeFrontmatter(recipe.summary)}`,
    `sourceType: ${escapeFrontmatter(recipe.sourceType)}`,
    `sourceRef: ${escapeFrontmatter(recipe.sourceRef ?? "")}`,
    `servings: ${escapeFrontmatter(recipe.servings ?? "")}`,
    `cuisine: ${escapeFrontmatter(recipe.cuisine ?? "")}`,
    `mealType: ${escapeFrontmatter(recipe.mealType ?? "")}`,
    `rating: ${recipe.rating}`,
    `createdAt: ${escapeFrontmatter(recipe.createdAt)}`,
    `updatedAt: ${escapeFrontmatter(recipe.updatedAt)}`,
    "tags:",
    ...recipe.tagIds.map((tagId) => `  - ${escapeFrontmatter(tagId)}`),
    "linkedRecipes:",
    ...(recipe.linkedRecipeIds ?? []).map((id) => `  - ${escapeFrontmatter(id)}`),
    "---",
  ].join("\n");

  const ingredients = recipe.ingredients.map((ingredient) => `- ${ingredient.raw}`).join("\n");
  const instructions = recipe.instructions
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");

  return `${frontmatter}

# ${recipe.title}

## Summary
${recipe.summary}

## Ingredients
${ingredients}

## Instructions
${instructions}
`;
}

function parseFrontmatterValue(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw.trim();
  }
}

function parseSourceType(value: string | string[] | undefined) {
  if (typeof value !== "string") return "manual";
  const normalized = value === "photo" ? "file" : value;
  return isSourceType(normalized) ? normalized : "manual";
}

function parseFrontmatterString(frontmatter: Map<string, string | string[]>, key: string) {
  const value = frontmatter.get(key);
  return typeof value === "string" ? value : "";
}

function parseFrontmatterStringList(frontmatter: Map<string, string | string[]>, key: string) {
  const value = frontmatter.get(key);
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function parseRecipeMarkdown(markdown: string, attachment?: string): Recipe {
  const [, frontmatterBlock = "", body = ""] =
    markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) ?? [];
  const lines = frontmatterBlock.split("\n");
  const frontmatter = new Map<string, string | string[]>();
  let currentListKey = "";

  for (const line of lines) {
    if (line.startsWith("  - ") && currentListKey) {
      const list = (frontmatter.get(currentListKey) as string[] | undefined) ?? [];
      list.push(String(parseFrontmatterValue(line.slice(4))));
      frontmatter.set(currentListKey, list);
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1).trim();
    currentListKey = value === "" ? key : "";
    frontmatter.set(key, value === "" ? [] : String(parseFrontmatterValue(value)));
  }

  const sections = body.split(/\n##\s+/);
  const summarySection = sections.find((section) => section.startsWith("Summary"));
  const ingredientsSection = sections.find((section) => section.startsWith("Ingredients"));
  const instructionsSection = sections.find((section) => section.startsWith("Instructions"));

  return {
    id: parseFrontmatterString(frontmatter, "id") || crypto.randomUUID(),
    title: parseFrontmatterString(frontmatter, "title") || "Untitled recipe",
    summary:
      summarySection?.replace(/^Summary\s*/, "").trim() ??
      parseFrontmatterString(frontmatter, "summary"),
    sourceType: parseSourceType(frontmatter.get("sourceType")),
    sourceRef: parseFrontmatterString(frontmatter, "sourceRef") || undefined,
    heroImage: attachment,
    ingredients: (ingredientsSection?.split("\n").slice(1) ?? [])
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        id: `${parseFrontmatterString(frontmatter, "id") || "recipe"}-${slugify(line)}`,
        name: line.replace(/^-\s*/, ""),
        raw: line.replace(/^-\s*/, ""),
      })),
    instructions: (instructionsSection?.split("\n").slice(1) ?? [])
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\d+[.)]\s*/, "")),
    servings: parseFrontmatterString(frontmatter, "servings") || undefined,
    cuisine: parseFrontmatterString(frontmatter, "cuisine") || undefined,
    mealType: parseFrontmatterString(frontmatter, "mealType") || undefined,
    rating: Number(frontmatter.get("rating") ?? 0),
    tagIds: parseFrontmatterStringList(frontmatter, "tags"),
    linkedRecipeIds: parseFrontmatterStringList(frontmatter, "linkedRecipes"),
    createdAt: parseFrontmatterString(frontmatter, "createdAt") || new Date().toISOString(),
    updatedAt: parseFrontmatterString(frontmatter, "updatedAt") || new Date().toISOString(),
  };
}

export function createFallbackVaultSnapshot(): VaultSnapshot {
  return {
    recipeFiles: {},
    attachments: {},
    taxonomy: createDefaultTaxonomy(),
  };
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function isTaxonomy(value: unknown): value is Taxonomy {
  return Boolean(
    value &&
      typeof value === "object" &&
      "categories" in value &&
      Array.isArray(value.categories) &&
      "tags" in value &&
      Array.isArray(value.tags),
  );
}

export function normalizeVaultSnapshot(value: unknown): VaultSnapshot {
  const fallback = createFallbackVaultSnapshot();
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const snapshot = value as Partial<VaultSnapshot>;
  return {
    recipeFiles: normalizeStringRecord(snapshot.recipeFiles),
    attachments: normalizeStringRecord(snapshot.attachments),
    taxonomy: isTaxonomy(snapshot.taxonomy) ? snapshot.taxonomy : fallback.taxonomy,
  };
}

export function parseVaultSnapshot(raw: string | null | undefined): VaultSnapshot {
  if (!raw) {
    return createFallbackVaultSnapshot();
  }
  try {
    return normalizeVaultSnapshot(JSON.parse(raw));
  } catch {
    return createFallbackVaultSnapshot();
  }
}

export function toAppSnapshot(snapshot: VaultSnapshot): AppSnapshot {
  return {
    recipes: Object.entries(snapshot.recipeFiles)
      .map(([recipeId, markdown]) => parseRecipeMarkdown(markdown, snapshot.attachments[recipeId]))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    taxonomy:
      snapshot.taxonomy && snapshot.taxonomy.categories.length > 0
        ? snapshot.taxonomy
        : createDefaultTaxonomy(),
  };
}
