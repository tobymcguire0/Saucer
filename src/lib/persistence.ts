import { invoke } from "@tauri-apps/api/core";

import { createDefaultTaxonomy, slugify } from "./defaultTaxonomy";
import type { AppSnapshot, Recipe, Taxonomy } from "./models";
import { isSourceType } from "./typeGuards";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface VaultSnapshot {
  recipeFiles: Record<string, string>;
  attachments: Record<string, string>;
  taxonomy?: Taxonomy;
}

const vaultKey = "cookbook:obsidian:vault";

export interface RecipeStore {
  load(): Promise<AppSnapshot>;
  saveRecipe(recipe: Recipe): Promise<AppSnapshot>;
  deleteRecipe(recipeId: string): Promise<AppSnapshot>;
  saveTaxonomy(taxonomy: Taxonomy): Promise<AppSnapshot>;
  replaceAll(recipes: Recipe[], taxonomy: Taxonomy): Promise<AppSnapshot>;
}

function escapeFrontmatter(value: string) {
  return JSON.stringify(value);
}

function serializeRecipe(recipe: Recipe) {
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

function createFallbackVaultSnapshot(): VaultSnapshot {
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

function normalizeVaultSnapshot(value: unknown): VaultSnapshot {
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

function parseVaultSnapshot(raw: string | null | undefined): VaultSnapshot {
  if (!raw) {
    return createFallbackVaultSnapshot();
  }

  try {
    return normalizeVaultSnapshot(JSON.parse(raw));
  } catch {
    return createFallbackVaultSnapshot();
  }
}

function parseSourceType(value: string | string[] | undefined) {
  return typeof value === "string" && isSourceType(value) ? value : "manual";
}

function parseFrontmatterString(frontmatter: Map<string, string | string[]>, key: string) {
  const value = frontmatter.get(key);
  return typeof value === "string" ? value : "";
}

function parseFrontmatterStringList(frontmatter: Map<string, string | string[]>, key: string) {
  const value = frontmatter.get(key);
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
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
    createdAt: parseFrontmatterString(frontmatter, "createdAt") || new Date().toISOString(),
    updatedAt: parseFrontmatterString(frontmatter, "updatedAt") || new Date().toISOString(),
  };
}

function getLocalStorage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function canUseTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function toAppSnapshot(snapshot: VaultSnapshot): AppSnapshot {
  return {
    recipes: Object.entries(snapshot.recipeFiles)
      .map(([recipeId, markdown]) => parseRecipeMarkdown(markdown, snapshot.attachments[recipeId]))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    taxonomy: snapshot.taxonomy && snapshot.taxonomy.categories.length > 0
      ? snapshot.taxonomy
      : createDefaultTaxonomy(),
  };
}

export class ObsidianRecipeStore implements RecipeStore {
  constructor(private readonly storage: StorageLike | undefined = getLocalStorage()) {}

  private persist(snapshot: VaultSnapshot) {
    const normalized: VaultSnapshot = {
      recipeFiles: snapshot.recipeFiles,
      attachments: snapshot.attachments,
      taxonomy: snapshot.taxonomy ?? createDefaultTaxonomy(),
    };
    this.storage?.setItem(vaultKey, JSON.stringify(normalized));
    return toAppSnapshot(normalized);
  }

  private buildRecipePath(recipe: Recipe) {
    return `recipes/${recipe.id}-${slugify(recipe.title)}.md`;
  }

  private getDefaultSnapshot(): VaultSnapshot {
    return createFallbackVaultSnapshot();
  }

  private async loadFromTauri(): Promise<VaultSnapshot> {
    const snapshot = await invoke<VaultSnapshot>("load_vault_snapshot");
    return {
      recipeFiles: snapshot.recipeFiles ?? {},
      attachments: snapshot.attachments ?? {},
      taxonomy: snapshot.taxonomy ?? createDefaultTaxonomy(),
    };
  }

  private async replaceInTauri(snapshot: VaultSnapshot): Promise<VaultSnapshot> {
    const normalized: VaultSnapshot = {
      recipeFiles: snapshot.recipeFiles,
      attachments: snapshot.attachments,
      taxonomy: snapshot.taxonomy ?? createDefaultTaxonomy(),
    };

    const nextSnapshot = await invoke<VaultSnapshot>("replace_vault_snapshot", {
      snapshot: {
        recipeFiles: normalized.recipeFiles,
        recipePaths: Object.fromEntries(
          Object.entries(normalized.recipeFiles).map(([recipeId, markdown]) => [
            recipeId,
            this.buildRecipePath(parseRecipeMarkdown(markdown, normalized.attachments[recipeId])),
          ]),
        ),
        attachments: normalized.attachments,
        taxonomy: normalized.taxonomy,
      },
    });

    return {
      recipeFiles: nextSnapshot.recipeFiles ?? {},
      attachments: nextSnapshot.attachments ?? {},
      taxonomy: nextSnapshot.taxonomy ?? createDefaultTaxonomy(),
    };
  }

  async load() {
    if (canUseTauri()) {
      return toAppSnapshot(await this.loadFromTauri());
    }

    const raw = this.storage?.getItem(vaultKey);
    if (!raw) {
      return this.persist(this.getDefaultSnapshot());
    }

    const snapshot = parseVaultSnapshot(raw);
    return this.persist(snapshot);
  }

  async saveRecipe(recipe: Recipe) {
    const current = await this.loadRaw();
    const nextRecipe = {
      ...recipe,
      updatedAt: new Date().toISOString(),
      createdAt: recipe.createdAt || new Date().toISOString(),
    };
    current.recipeFiles[nextRecipe.id] = serializeRecipe(nextRecipe);
    if (nextRecipe.heroImage) {
      current.attachments[nextRecipe.id] = nextRecipe.heroImage;
    } else {
      delete current.attachments[nextRecipe.id];
    }
    if (canUseTauri()) {
      return toAppSnapshot(await this.replaceInTauri(current));
    }
    return this.persist(current);
  }

  async deleteRecipe(recipeId: string) {
    const current = await this.loadRaw();
    delete current.recipeFiles[recipeId];
    delete current.attachments[recipeId];
    if (canUseTauri()) {
      return toAppSnapshot(await this.replaceInTauri(current));
    }
    return this.persist(current);
  }

  async saveTaxonomy(taxonomy: Taxonomy) {
    const current = await this.loadRaw();
    current.taxonomy = taxonomy;
    if (canUseTauri()) {
      return toAppSnapshot(await this.replaceInTauri(current));
    }
    return this.persist(current);
  }

  async replaceAll(recipes: Recipe[], taxonomy: Taxonomy) {
    const snapshot: VaultSnapshot = {
      recipeFiles: {},
      attachments: {},
      taxonomy,
    };

    for (const recipe of recipes) {
      snapshot.recipeFiles[recipe.id] = serializeRecipe(recipe);
      if (recipe.heroImage) {
        snapshot.attachments[recipe.id] = recipe.heroImage;
      }
    }

    if (canUseTauri()) {
      return toAppSnapshot(await this.replaceInTauri(snapshot));
    }
    return this.persist(snapshot);
  }

  private async loadRaw(): Promise<VaultSnapshot> {
    if (canUseTauri()) {
      return this.loadFromTauri();
    }
    const raw = this.storage?.getItem(vaultKey);
    return parseVaultSnapshot(raw);
  }
}
