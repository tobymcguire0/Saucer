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

const LOCAL_IDS_KEY = "saucer:local-recipe-ids";

function loadLocalRecipeIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_IDS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocalRecipeIds(ids: Set<string>): void {
  localStorage.setItem(LOCAL_IDS_KEY, JSON.stringify([...ids]));
}

function createInitialState() {
  return {
    recipes: [] as Recipe[],
    taxonomy: ensureDefaultTaxonomy(),
    loading: true,
    initialized: false,
    localRecipeIds: loadLocalRecipeIds(),
  };
}

type SaucerStoreState = ReturnType<typeof createInitialState> & {
  initialize: () => Promise<void>;
  bootstrapFromServer: (recipes: Recipe[], taxonomy: Taxonomy) => Promise<void>;
  mergeServerChanges: (updatedRecipes: Recipe[], deletedIds: string[]) => void;
  replaceAll: (
    recipes: Recipe[],
    taxonomy: Taxonomy,
    message: string,
    tone?: StatusTone,
  ) => Promise<void>;
  markRecipeAsLocal: (id: string) => void;
  confirmRecipes: (serverIds: Set<string>) => void;
  deleteRecipe: (recipeId: string) => Promise<boolean>;
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
  bootstrapFromServer: async (recipes, taxonomy) => {
    const snapshot = await getRecipeStore().replaceAll(recipes, taxonomy);
    set({
      recipes: snapshot.recipes,
      taxonomy: snapshot.taxonomy,
      loading: false,
      initialized: true,
    });
    useStatusStore.getState().updateStatus("Synced with server.", "success");
  },
  mergeServerChanges: (updatedRecipes, deletedIds) => {
    const { recipes } = get();
    const updatedMap = new Map(updatedRecipes.map((r) => [r.id, r]));
    const deletedSet = new Set(deletedIds);
    const merged = recipes
      .filter((r) => !deletedSet.has(r.id))
      .map((r) => updatedMap.get(r.id) ?? r);
    for (const r of updatedRecipes) {
      if (!recipes.find((existing) => existing.id === r.id)) {
        merged.push(r);
      }
    }
    set({ recipes: merged });
    get().confirmRecipes(new Set(updatedRecipes.map((r) => r.id)));
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
  markRecipeAsLocal: (id) => {
    const next = new Set(get().localRecipeIds);
    next.add(id);
    saveLocalRecipeIds(next);
    set({ localRecipeIds: next });
  },
  confirmRecipes: (serverIds) => {
    const current = get().localRecipeIds;
    const next = new Set([...current].filter((id) => !serverIds.has(id)));
    if (next.size !== current.size) {
      saveLocalRecipeIds(next);
      set({ localRecipeIds: next });
    }
  },
  deleteRecipe: async (recipeId) => {
    const { localRecipeIds } = get();
    const { useSyncStore } = await import("../sync/useSyncStore");
    const connected = useSyncStore.getState().connected;

    if (!connected && !localRecipeIds.has(recipeId)) {
      useStatusStore
        .getState()
        .updateStatus(
          "Cannot delete a synced recipe while offline. Connect to the server first.",
          "error",
        );
      return false;
    }

    const snapshot = await getRecipeStore().deleteRecipe(recipeId);
    set({
      recipes: snapshot.recipes,
      taxonomy: snapshot.taxonomy,
      loading: false,
      initialized: true,
    });
    useStatusStore.getState().updateStatus("Recipe deleted.", "success");
    void useSyncStore.getState().pushMutation({
      type: "deleteRecipe",
      clientMutationId: crypto.randomUUID(),
      recipeId,
      revision: 0,
    });
    return true;
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
