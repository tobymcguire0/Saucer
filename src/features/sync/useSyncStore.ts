import { create } from "zustand";

import type { ApiClient, ApiMutation, ApiRecipe, ApiTaxonomy } from "../../lib/apiClient";
import type { Recipe, Taxonomy } from "../../lib/models";
import { useSaucerStore } from "../saucer/useSaucerStore";

function toClientRecipe(r: ApiRecipe): Recipe {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary ?? "",
    sourceType: (r.sourceType as Recipe["sourceType"]) ?? "manual",
    sourceRef: r.sourceRef,
    heroImage: r.heroImage,
    ingredients: r.ingredients,
    instructions: r.instructions ?? [],
    servings: r.servings,
    cuisine: r.cuisine,
    mealType: r.mealType,
    rating: r.rating ?? 0,
    tagIds: r.tagIds ?? [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    revision: r.revision,
  };
}

function toClientTaxonomy(t: ApiTaxonomy): Taxonomy {
  return {
    categories: t.categories,
    tags: t.tags.map((tag) => ({ ...tag, aliases: tag.aliases ?? [] })),
  };
}

function mergeTaxonomy(serverTaxonomy: Taxonomy, localTaxonomy: Taxonomy): Taxonomy {
  const serverCategoryIds = new Set(serverTaxonomy.categories.map((category) => category.id));
  const serverTagIds = new Set(serverTaxonomy.tags.map((tag) => tag.id));

  return {
    categories: [
      ...serverTaxonomy.categories,
      ...localTaxonomy.categories.filter((category) => !serverCategoryIds.has(category.id)),
    ],
    tags: [...serverTaxonomy.tags, ...localTaxonomy.tags.filter((tag) => !serverTagIds.has(tag.id))],
  };
}

function hasLocalTaxonomyEntries(serverTaxonomy: Taxonomy, localTaxonomy: Taxonomy): boolean {
  const serverCategoryIds = new Set(serverTaxonomy.categories.map((category) => category.id));
  const serverTagIds = new Set(serverTaxonomy.tags.map((tag) => tag.id));

  return (
    localTaxonomy.categories.some((category) => !serverCategoryIds.has(category.id)) ||
    localTaxonomy.tags.some((tag) => !serverTagIds.has(tag.id))
  );
}

interface SyncState {
  connected: boolean;
  cursor: string | null;
  taxonomyRevision: number;
  client: ApiClient | null;
  setClient: (client: ApiClient) => void;
  setConnected: (connected: boolean) => void;
  setTaxonomyRevision: (taxonomyRevision: number) => void;
  bootstrap: () => Promise<void>;
  pullChanges: () => Promise<void>;
  pushMutation: (mutation: ApiMutation) => Promise<void>;
  saveTaxonomy: (taxonomy: Taxonomy) => Promise<void>;
  reset: () => void;
}

function createInitialState() {
  return {
    connected: false,
    cursor: null,
    taxonomyRevision: 0,
    client: null as ApiClient | null,
  };
}

export const useSyncStore = create<SyncState>((set, get) => ({
  ...createInitialState(),

  setClient: (client) => set({ client }),

  setConnected: (connected) => set({ connected }),

  setTaxonomyRevision: (taxonomyRevision) => set({ taxonomyRevision }),

  bootstrap: async () => {
    const { client } = get();
    if (!client) return;
    try {
      const { recipes: currentRecipes, localRecipeIds, taxonomy: localTaxonomy } = useSaucerStore.getState();
      const localOnlyRecipes = currentRecipes.filter((r) => localRecipeIds.has(r.id));

      const payload = await client.bootstrap();
      const serverRecipes = payload.recipes.map(toClientRecipe);
      const serverTaxonomy = toClientTaxonomy(payload.taxonomy);
      const mergedTaxonomy = mergeTaxonomy(serverTaxonomy, localTaxonomy);

      const serverIdSet = new Set(serverRecipes.map((r) => r.id));
      const newLocals = localOnlyRecipes.filter((r) => !serverIdSet.has(r.id));

      await useSaucerStore.getState().bootstrapFromServer([...serverRecipes, ...newLocals], mergedTaxonomy);

      let nextTaxonomyRevision = payload.taxonomyRevision;
      if (hasLocalTaxonomyEntries(serverTaxonomy, localTaxonomy)) {
        const savedTaxonomy = await client.saveTaxonomy(mergedTaxonomy);
        nextTaxonomyRevision = savedTaxonomy.revision;
      }

      useSaucerStore.getState().confirmRecipes(serverIdSet);

      for (const recipe of newLocals) {
        const { createdAt: _ca, updatedAt: _ua, revision: _rev, ...recipeInput } = recipe;
        void get().pushMutation({
          type: "upsertRecipe",
          clientMutationId: crypto.randomUUID(),
          recipe: recipeInput,
        });
      }

      set({ connected: true, cursor: payload.cursor, taxonomyRevision: nextTaxonomyRevision });
    } catch {
      set({ connected: false });
    }
  },

  pullChanges: async () => {
    const { client, cursor, taxonomyRevision } = get();
    if (!client || cursor === null) return;
    try {
      const payload = await client.syncChanges(cursor, taxonomyRevision);
      const nextTaxonomy = payload.taxonomy ? toClientTaxonomy(payload.taxonomy) : undefined;
      if (payload.recipes.length > 0 || payload.deletedIds.length > 0 || nextTaxonomy) {
        const updatedRecipes = payload.recipes.map(toClientRecipe);
        await useSaucerStore.getState().mergeServerChanges(updatedRecipes, payload.deletedIds, nextTaxonomy);
      }
      set({
        connected: true,
        cursor: payload.cursor,
        taxonomyRevision: payload.taxonomyRevision ?? taxonomyRevision,
      });
    } catch {
      set({ connected: false });
    }
  },

  pushMutation: async (mutation) => {
    const { client, taxonomyRevision } = get();
    if (!client) return;
    try {
      const payload = await client.push([mutation]);
      const nextTaxonomy = payload.taxonomy ? toClientTaxonomy(payload.taxonomy) : undefined;
      if (payload.recipes.length > 0 || payload.deletedIds.length > 0 || nextTaxonomy) {
        const updatedRecipes = payload.recipes.map(toClientRecipe);
        await useSaucerStore.getState().mergeServerChanges(updatedRecipes, payload.deletedIds, nextTaxonomy);
      }
      set({
        connected: true,
        cursor: payload.cursor,
        taxonomyRevision: payload.taxonomyRevision ?? taxonomyRevision,
      });
    } catch {
      set({ connected: false });
    }
  },

  saveTaxonomy: async (taxonomy) => {
    const { client } = get();
    if (!client) return;
    try {
      const savedTaxonomy = await client.saveTaxonomy(taxonomy);
      set({ connected: true, taxonomyRevision: savedTaxonomy.revision });
    } catch (error) {
      set({ connected: false });
      throw error;
    }
  },

  reset: () => set(createInitialState()),
}));

export function resetSyncStore() {
  useSyncStore.getState().reset();
}
