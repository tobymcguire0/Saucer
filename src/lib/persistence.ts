import { createDefaultTaxonomy, slugify } from "./defaultTaxonomy";
import type { AppSnapshot, Recipe, Taxonomy } from "./models";
import { createSeedRecipes } from "./seedData";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface VaultSnapshot {
  recipeFiles: Record<string, string>;
  recipePaths: Record<string, string>;
  attachments: Record<string, string>;
  taxonomy: Taxonomy;
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
    `heroImagePath: ${escapeFrontmatter(recipe.heroImagePath ?? "")}`,
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
    id: String(frontmatter.get("id") ?? crypto.randomUUID()),
    title: String(frontmatter.get("title") ?? "Untitled recipe"),
    summary:
      summarySection?.replace(/^Summary\s*/, "").trim() ??
      String(frontmatter.get("summary") ?? ""),
    sourceType: String(frontmatter.get("sourceType") ?? "manual") as Recipe["sourceType"],
    sourceRef: String(frontmatter.get("sourceRef") ?? "") || undefined,
    heroImage: attachment,
    heroImagePath: String(frontmatter.get("heroImagePath") ?? "") || undefined,
    ingredients: (ingredientsSection?.split("\n").slice(1) ?? [])
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        id: `${String(frontmatter.get("id") ?? "recipe")}-${slugify(line)}`,
        name: line.replace(/^-\s*/, ""),
        raw: line.replace(/^-\s*/, ""),
      })),
    instructions: (instructionsSection?.split("\n").slice(1) ?? [])
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\d+[.)]\s*/, "")),
    servings: String(frontmatter.get("servings") ?? "") || undefined,
    cuisine: String(frontmatter.get("cuisine") ?? "") || undefined,
    mealType: String(frontmatter.get("mealType") ?? "") || undefined,
    rating: Number(frontmatter.get("rating") ?? 0),
    tagIds: (frontmatter.get("tags") as string[] | undefined) ?? [],
    createdAt: String(frontmatter.get("createdAt") ?? new Date().toISOString()),
    updatedAt: String(frontmatter.get("updatedAt") ?? new Date().toISOString()),
  };
}

function getLocalStorage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export class ObsidianRecipeStore implements RecipeStore {
  constructor(private readonly storage: StorageLike | undefined = getLocalStorage()) {}

  private persist(snapshot: VaultSnapshot) {
    this.storage?.setItem(vaultKey, JSON.stringify(snapshot));
    return {
      recipes: Object.entries(snapshot.recipeFiles)
        .map(([recipeId, markdown]) => parseRecipeMarkdown(markdown, snapshot.attachments[recipeId]))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      taxonomy: snapshot.taxonomy,
    };
  }

  private buildRecipePath(recipe: Recipe) {
    return `recipes/${recipe.id}-${slugify(recipe.title)}.md`;
  }

  private getDefaultSnapshot() {
    const taxonomy = createDefaultTaxonomy();
    const recipes = createSeedRecipes(taxonomy);
    const snapshot: VaultSnapshot = {
      recipeFiles: {},
      recipePaths: {},
      attachments: {},
      taxonomy,
    };

    for (const recipe of recipes) {
      snapshot.recipeFiles[recipe.id] = serializeRecipe(recipe);
      snapshot.recipePaths[recipe.id] = this.buildRecipePath(recipe);
      if (recipe.heroImage) {
        snapshot.attachments[recipe.id] = recipe.heroImage;
      }
    }

    return snapshot;
  }

  async load() {
    const raw = this.storage?.getItem(vaultKey);
    if (!raw) {
      return this.persist(this.getDefaultSnapshot());
    }

    const snapshot = JSON.parse(raw) as VaultSnapshot;
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
    current.recipePaths[nextRecipe.id] = this.buildRecipePath(nextRecipe);
    if (nextRecipe.heroImage) {
      current.attachments[nextRecipe.id] = nextRecipe.heroImage;
    } else {
      delete current.attachments[nextRecipe.id];
    }
    return this.persist(current);
  }

  async deleteRecipe(recipeId: string) {
    const current = await this.loadRaw();
    delete current.recipeFiles[recipeId];
    delete current.recipePaths[recipeId];
    delete current.attachments[recipeId];
    return this.persist(current);
  }

  async saveTaxonomy(taxonomy: Taxonomy) {
    const current = await this.loadRaw();
    current.taxonomy = taxonomy;
    return this.persist(current);
  }

  async replaceAll(recipes: Recipe[], taxonomy: Taxonomy) {
    const snapshot: VaultSnapshot = {
      recipeFiles: {},
      recipePaths: {},
      attachments: {},
      taxonomy,
    };

    for (const recipe of recipes) {
      snapshot.recipeFiles[recipe.id] = serializeRecipe(recipe);
      snapshot.recipePaths[recipe.id] = this.buildRecipePath(recipe);
      if (recipe.heroImage) {
        snapshot.attachments[recipe.id] = recipe.heroImage;
      }
    }

    return this.persist(snapshot);
  }

  private async loadRaw() {
    const raw = this.storage?.getItem(vaultKey);
    return raw ? (JSON.parse(raw) as VaultSnapshot) : this.getDefaultSnapshot();
  }
}
