import { create } from "zustand";

import type { Recipe, Taxonomy } from "../../lib/models";
import {
  addAlias,
  ensureDefaultTaxonomy,
  mergeTags,
  normalizeTerm,
  removeAlias as removeAliasFromTaxonomy,
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

async function syncTaxonomyIfConnected(taxonomy: Taxonomy): Promise<void> {
  const { useSyncStore } = await import("../sync/useSyncStore");
  const syncState = useSyncStore.getState();
  if (!syncState.connected || !syncState.client) {
    return;
  }
  await syncState.saveTaxonomy(taxonomy);
}

export function reconcileRecipeLinks(
  recipes: Recipe[],
  changedRecipes: Recipe[],
): { recipes: Recipe[]; touchedIds: Set<string> } {
  const now = new Date().toISOString();
  const byId = new Map<string, Recipe>();
  for (const recipe of recipes) {
    byId.set(recipe.id, recipe);
  }
  for (const changed of changedRecipes) {
    byId.set(changed.id, changed);
  }

  const touchedIds = new Set<string>(changedRecipes.map((r) => r.id));

  for (const changed of changedRecipes) {
    const nextLinks = new Set(changed.linkedRecipeIds ?? []);
    nextLinks.delete(changed.id);

    for (const targetId of nextLinks) {
      const target = byId.get(targetId);
      if (!target) continue;
      const targetLinks = new Set(target.linkedRecipeIds ?? []);
      if (!targetLinks.has(changed.id)) {
        targetLinks.add(changed.id);
        byId.set(targetId, {
          ...target,
          linkedRecipeIds: [...targetLinks],
          updatedAt: now,
        });
        touchedIds.add(targetId);
      }
    }

    for (const [otherId, other] of byId) {
      if (otherId === changed.id) continue;
      if (nextLinks.has(otherId)) continue;
      const otherLinks = other.linkedRecipeIds ?? [];
      if (otherLinks.includes(changed.id)) {
        byId.set(otherId, {
          ...other,
          linkedRecipeIds: otherLinks.filter((id) => id !== changed.id),
          updatedAt: now,
        });
        touchedIds.add(otherId);
      }
    }
  }

  return { recipes: [...byId.values()], touchedIds };
}

export function scrubLinksToDeleted(recipes: Recipe[], deletedId: string): {
  recipes: Recipe[];
  touchedIds: Set<string>;
} {
  const now = new Date().toISOString();
  const touchedIds = new Set<string>();
  const nextRecipes = recipes.map((recipe) => {
    if (recipe.id === deletedId) return recipe;
    const links = recipe.linkedRecipeIds ?? [];
    if (!links.includes(deletedId)) return recipe;
    touchedIds.add(recipe.id);
    return {
      ...recipe,
      linkedRecipeIds: links.filter((id) => id !== deletedId),
      updatedAt: now,
    };
  });
  return { recipes: nextRecipes, touchedIds };
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
  mergeServerChanges: (
    updatedRecipes: Recipe[],
    deletedIds: string[],
    taxonomy?: Taxonomy,
  ) => Promise<void>;
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
  removeAlias: (tagId: string, alias: string) => Promise<void>;
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
  mergeServerChanges: async (updatedRecipes, deletedIds, taxonomy) => {
    const { recipes, taxonomy: currentTaxonomy } = get();
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
    const snapshot = await getRecipeStore().replaceAll(merged, taxonomy ?? currentTaxonomy);
    set({
      recipes: snapshot.recipes,
      taxonomy: snapshot.taxonomy,
      loading: false,
      initialized: true,
    });
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
    const { localRecipeIds, recipes, taxonomy } = get();
    const { useSyncStore } = await import("../sync/useSyncStore");
    const { connected, cursor } = useSyncStore.getState();

    if (!connected && cursor !== null && !localRecipeIds.has(recipeId)) {
      useStatusStore
        .getState()
        .updateStatus(
          "Cannot delete a synced recipe while offline. Connect to the server first.",
          "error",
        );
      return false;
    }

    const { recipes: scrubbed, touchedIds } = scrubLinksToDeleted(recipes, recipeId);
    if (touchedIds.size > 0) {
      const remaining = scrubbed.filter((r) => r.id !== recipeId);
      await getRecipeStore().replaceAll(remaining, taxonomy);
    }

    const snapshot = await getRecipeStore().deleteRecipe(recipeId);
    set({
      recipes: snapshot.recipes,
      taxonomy: snapshot.taxonomy,
      loading: false,
      initialized: true,
    });
    useStatusStore.getState().updateStatus("Recipe deleted.", "success");

    for (const touchedId of touchedIds) {
      const updated = snapshot.recipes.find((r) => r.id === touchedId);
      if (!updated) continue;
      const { recipeToApiInput } = await import("../sync/useSyncStore");
      void useSyncStore.getState().pushMutation({
        type: "upsertRecipe",
        clientMutationId: crypto.randomUUID(),
        recipe: recipeToApiInput(updated),
      });
    }

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
    const updatedRecipe = nextRecipes.find((r) => r.id === recipeId);
    if (updatedRecipe) {
      const { useSyncStore, recipeToApiInput } = await import("../sync/useSyncStore");
      void useSyncStore.getState().pushMutation({
        type: "upsertRecipe",
        clientMutationId: crypto.randomUUID(),
        recipe: recipeToApiInput(updatedRecipe),
      });
    }
  },
  saveCategory: async (name, description) => {
    const { recipes, taxonomy, replaceAll } = get();
    const nextTaxonomy = upsertCategory(taxonomy, name, description);
    await replaceAll(recipes, nextTaxonomy, "Category saved.");
    try {
      await syncTaxonomyIfConnected(nextTaxonomy);
    } catch (error) {
      useStatusStore.getState().updateStatus(
        `Category saved locally, but taxonomy sync failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    }
  },
  saveTag: async (categoryId, name) => {
    const { recipes, taxonomy, replaceAll } = get();
    const nextTaxonomy = upsertTag(taxonomy, categoryId, name);
    await replaceAll(recipes, nextTaxonomy, "Canonical tag saved.");
    try {
      await syncTaxonomyIfConnected(nextTaxonomy);
    } catch (error) {
      useStatusStore.getState().updateStatus(
        `Canonical tag saved locally, but taxonomy sync failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    }
  },
  saveAlias: async (tagId, alias) => {
    const { recipes, taxonomy, replaceAll } = get();
    const nextTaxonomy = addAlias(taxonomy, tagId, alias);
    await replaceAll(recipes, nextTaxonomy, "Alias saved.");
    try {
      await syncTaxonomyIfConnected(nextTaxonomy);
    } catch (error) {
      useStatusStore.getState().updateStatus(
        `Alias saved locally, but taxonomy sync failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    }
  },
  removeAlias: async (tagId, alias) => {
    const { recipes, taxonomy, replaceAll } = get();
    const nextTaxonomy = removeAliasFromTaxonomy(taxonomy, tagId, alias);
    await replaceAll(recipes, nextTaxonomy, "Alias removed.");
    try {
      await syncTaxonomyIfConnected(nextTaxonomy);
    } catch (error) {
      useStatusStore.getState().updateStatus(
        `Alias removed locally, but taxonomy sync failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    }
  },
  mergeSelectedTags: async (sourceTagId, targetTagId) => {
    const { recipes, taxonomy, replaceAll } = get();
    const merged = mergeTags(taxonomy, recipes, sourceTagId, targetTagId);
    await replaceAll(
      merged.recipes,
      merged.taxonomy,
      "Tags merged and recipe assignments updated.",
    );
    try {
      await syncTaxonomyIfConnected(merged.taxonomy);
    } catch (error) {
      useStatusStore.getState().updateStatus(
        `Tags merged locally, but taxonomy sync failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    }
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
    try {
      await syncTaxonomyIfConnected(nextTaxonomy);
    } catch (error) {
      useStatusStore.getState().updateStatus(
        `Tag "${trimmedName}" saved locally, but taxonomy sync failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
    }
    return createdTag?.id;
  },
  reset: () => set(createInitialState()),
}));

export function resetSaucerStore() {
  useSaucerStore.getState().reset();
}
