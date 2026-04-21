import { invoke } from "@tauri-apps/api/core";

import { createDefaultTaxonomy, slugify } from "../defaultTaxonomy";
import type { AppSnapshot, Recipe, Taxonomy } from "../models";
import {
  canUseTauri,
  createFallbackVaultSnapshot,
  parseRecipeMarkdown,
  parseVaultSnapshot,
  serializeRecipe,
  toAppSnapshot,
  type RecipeStore,
  type VaultSnapshot,
} from "./index";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const vaultKey = "saucer:obsidian:vault";

function getLocalStorage(): StorageLike | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
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

    // recipePaths tells Rust the target filesystem path for each recipe file;
    // without it the backend wouldn't know where to write the markdown content.
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

  async load(): Promise<AppSnapshot> {
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

  async saveRecipe(recipe: Recipe): Promise<AppSnapshot> {
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

  async deleteRecipe(recipeId: string): Promise<AppSnapshot> {
    const current = await this.loadRaw();
    delete current.recipeFiles[recipeId];
    delete current.attachments[recipeId];
    if (canUseTauri()) {
      return toAppSnapshot(await this.replaceInTauri(current));
    }
    return this.persist(current);
  }

  async saveTaxonomy(taxonomy: Taxonomy): Promise<AppSnapshot> {
    const current = await this.loadRaw();
    current.taxonomy = taxonomy;
    if (canUseTauri()) {
      return toAppSnapshot(await this.replaceInTauri(current));
    }
    return this.persist(current);
  }

  async replaceAll(recipes: Recipe[], taxonomy: Taxonomy): Promise<AppSnapshot> {
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
