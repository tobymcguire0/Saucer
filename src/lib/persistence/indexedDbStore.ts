import { openDB } from "idb";

import { createDefaultTaxonomy } from "../defaultTaxonomy";
import type { AppSnapshot, Recipe, Taxonomy } from "../models";
import {
  serializeRecipe,
  toAppSnapshot,
  type RecipeStore,
  type VaultSnapshot,
} from "./index";

const DB_NAME = "saucer";
const DB_VERSION = 1;

interface RecipeRecord {
  id: string;
  markdown: string;
  attachment?: string;
}

interface MetaRecord {
  key: string;
  value: unknown;
}

function openSaucerDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("recipes")) {
        db.createObjectStore("recipes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    },
  });
}

export class IndexedDbRecipeStore implements RecipeStore {
  private async loadSnapshot(): Promise<VaultSnapshot> {
    const db = await openSaucerDb();
    const [recipeRecords, taxonomyRecord] = await Promise.all([
      db.getAll("recipes") as Promise<RecipeRecord[]>,
      db.get("meta", "taxonomy") as Promise<MetaRecord | undefined>,
    ]);

    const recipeFiles: Record<string, string> = {};
    const attachments: Record<string, string> = {};

    for (const record of recipeRecords) {
      recipeFiles[record.id] = record.markdown;
      if (record.attachment) {
        attachments[record.id] = record.attachment;
      }
    }

    return {
      recipeFiles,
      attachments,
      taxonomy: (taxonomyRecord?.value as Taxonomy | undefined) ?? createDefaultTaxonomy(),
    };
  }

  async load(): Promise<AppSnapshot> {
    return toAppSnapshot(await this.loadSnapshot());
  }

  async saveRecipe(recipe: Recipe): Promise<AppSnapshot> {
    const db = await openSaucerDb();
    const nextRecipe: Recipe = {
      ...recipe,
      updatedAt: new Date().toISOString(),
      createdAt: recipe.createdAt || new Date().toISOString(),
    };
    const record: RecipeRecord = {
      id: nextRecipe.id,
      markdown: serializeRecipe(nextRecipe),
    };
    if (nextRecipe.heroImage) {
      record.attachment = nextRecipe.heroImage;
    }
    await db.put("recipes", record);
    return this.load();
  }

  async deleteRecipe(recipeId: string): Promise<AppSnapshot> {
    const db = await openSaucerDb();
    await db.delete("recipes", recipeId);
    return this.load();
  }

  async saveTaxonomy(taxonomy: Taxonomy): Promise<AppSnapshot> {
    const db = await openSaucerDb();
    await db.put("meta", { key: "taxonomy", value: taxonomy });
    return this.load();
  }

  async replaceAll(recipes: Recipe[], taxonomy: Taxonomy): Promise<AppSnapshot> {
    const db = await openSaucerDb();
    const tx = db.transaction(["recipes", "meta"], "readwrite");
    await tx.objectStore("recipes").clear();
    for (const recipe of recipes) {
      const record: RecipeRecord = {
        id: recipe.id,
        markdown: serializeRecipe(recipe),
      };
      if (recipe.heroImage) {
        record.attachment = recipe.heroImage;
      }
      await tx.objectStore("recipes").put(record);
    }
    await tx.objectStore("meta").put({ key: "taxonomy", value: taxonomy });
    await tx.done;
    return this.load();
  }
}
