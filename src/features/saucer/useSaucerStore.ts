import { create } from "zustand";

import type { Recipe, Taxonomy } from "../../lib/models";
import {
  addAlias,
  ensureDefaultTaxonomy,
  mergeTags,
  normalizeTerm,
  upsertCategory,
  upsertTag,
} from "../../lib/taxonomy";
import { useStatusStore, type StatusTone } from "../status/useStatusStore";
import { getRecipeStore } from "./recipeStore";

function createInitialState() {
  return {
    recipes: [] as Recipe[],
    taxonomy: ensureDefaultTaxonomy(),
    loading: true,
    initialized: false,
  };
}

type SaucerStoreState = ReturnType<typeof createInitialState> & {
  initialize: () => Promise<void>;
  replaceAll: (
    recipes: Recipe[],
    taxonomy: Taxonomy,
    message: string,
    tone?: StatusTone,
  ) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  updateRecipeRating: (recipeId: string, rating: number) => Promise<void>;
  saveCategory: (name: string, description: string) => Promise<void>;
  saveTag: (categoryId: string, name: string) => Promise<void>;
  saveAlias: (tagId: string, alias: string) => Promise<void>;
  mergeSelectedTags: (sourceTagId: string, targetTagId: string) => Promise<void>;
  addDraftTag: (categoryId: string, name: string) => Promise<string | undefined>;
  reset: () => void;
};

export const useSaucerStore = create<SaucerStoreState>((set, get) => ({
  ...createInitialState(),
  initialize: async () => {
    if (get().initialized && !get().loading) {
      return;
    }

    set({ loading: true });

    try {
      const snapshot = await getRecipeStore().load();
      set({
        recipes: snapshot.recipes,
        taxonomy: snapshot.taxonomy,
        loading: false,
        initialized: true,
      });
      useStatusStore
        .getState()
        .updateStatus("Saucer loaded from local Obsidian-style storage.", "success");
    } catch (error) {
      set({
        loading: false,
        initialized: true,
      });
      useStatusStore.getState().updateStatus(
        `Failed to load saved data: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    }
  },
  replaceAll: async (recipes, taxonomy, message, tone = "success") => {
    const snapshot = await getRecipeStore().replaceAll(recipes, taxonomy);
    set({
      recipes: snapshot.recipes,
      taxonomy: snapshot.taxonomy,
      loading: false,
      initialized: true,
    });
    useStatusStore.getState().updateStatus(message, tone);
  },
  deleteRecipe: async (recipeId) => {
    const snapshot = await getRecipeStore().deleteRecipe(recipeId);
    set({
      recipes: snapshot.recipes,
      taxonomy: snapshot.taxonomy,
      loading: false,
      initialized: true,
    });
    useStatusStore.getState().updateStatus("Recipe deleted.", "success");
  },
  updateRecipeRating: async (recipeId, rating) => {
    const { recipes, taxonomy, replaceAll } = get();
    const nextRecipes = recipes.map((recipe) =>
      recipe.id === recipeId ? { ...recipe, rating, updatedAt: new Date().toISOString() } : recipe,
    );
    await replaceAll(nextRecipes, taxonomy, "Recipe rating updated.");
  },
  saveCategory: async (name, description) => {
    const { recipes, taxonomy, replaceAll } = get();
    const nextTaxonomy = upsertCategory(taxonomy, name, description);
    await replaceAll(recipes, nextTaxonomy, "Category saved.");
  },
  saveTag: async (categoryId, name) => {
    const { recipes, taxonomy, replaceAll } = get();
    const nextTaxonomy = upsertTag(taxonomy, categoryId, name);
    await replaceAll(recipes, nextTaxonomy, "Canonical tag saved.");
  },
  saveAlias: async (tagId, alias) => {
    const { recipes, taxonomy, replaceAll } = get();
    const nextTaxonomy = addAlias(taxonomy, tagId, alias);
    await replaceAll(recipes, nextTaxonomy, "Alias saved.");
  },
  mergeSelectedTags: async (sourceTagId, targetTagId) => {
    const { recipes, taxonomy, replaceAll } = get();
    const merged = mergeTags(taxonomy, recipes, sourceTagId, targetTagId);
    await replaceAll(
      merged.recipes,
      merged.taxonomy,
      "Tags merged and recipe assignments updated.",
    );
  },
  addDraftTag: async (categoryId, name) => {
    const trimmedName = name.trim();
    const { recipes, taxonomy, replaceAll } = get();
    const nextTaxonomy = upsertTag(taxonomy, categoryId, trimmedName);
    const createdTag = nextTaxonomy.tags.find(
      (tag) =>
        tag.categoryId === categoryId && normalizeTerm(tag.name) === normalizeTerm(trimmedName),
    );

    await replaceAll(recipes, nextTaxonomy, `Tag "${trimmedName}" added to the recipe form.`);
    return createdTag?.id;
  },
  reset: () => set(createInitialState()),
}));

export function resetSaucerStore() {
  useSaucerStore.getState().reset();
}
