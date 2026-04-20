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

interface SyncState {
  connected: boolean;
  cursor: string | null;
  client: ApiClient | null;
  setClient: (client: ApiClient) => void;
  setConnected: (connected: boolean) => void;
  bootstrap: () => Promise<void>;
  pullChanges: () => Promise<void>;
  pushMutation: (mutation: ApiMutation) => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  connected: false,
  cursor: null,
  client: null,

  setClient: (client) => set({ client }),

  setConnected: (connected) => set({ connected }),

  bootstrap: async () => {
    const { client } = get();
    if (!client) return;
    try {
      const { recipes: currentRecipes, localRecipeIds } = useSaucerStore.getState();
      const localOnlyRecipes = currentRecipes.filter((r) => localRecipeIds.has(r.id));

      const payload = await client.bootstrap();
      const serverRecipes = payload.recipes.map(toClientRecipe);
      const serverTaxonomy = toClientTaxonomy(payload.taxonomy);

      // Merge local-only taxonomy items the server doesn't have
      const { taxonomy: localTaxonomy } = useSaucerStore.getState();
      const serverCategoryIds = new Set(serverTaxonomy.categories.map((c) => c.id));
      const serverTagIds = new Set(serverTaxonomy.tags.map((t) => t.id));
      const mergedTaxonomy: Taxonomy = {
        categories: [
          ...serverTaxonomy.categories,
          ...localTaxonomy.categories.filter((c) => !serverCategoryIds.has(c.id)),
        ],
        tags: [
          ...serverTaxonomy.tags,
          ...localTaxonomy.tags.filter((t) => !serverTagIds.has(t.id)),
        ],
      };

      const serverIdSet = new Set(serverRecipes.map((r) => r.id));
      const newLocals = localOnlyRecipes.filter((r) => !serverIdSet.has(r.id));

      await useSaucerStore.getState().bootstrapFromServer([...serverRecipes, ...newLocals], mergedTaxonomy);

      useSaucerStore.getState().confirmRecipes(serverIdSet);

      for (const recipe of newLocals) {
        const { createdAt: _ca, updatedAt: _ua, revision: _rev, ...recipeInput } = recipe;
        void get().pushMutation({
          type: "upsertRecipe",
          clientMutationId: crypto.randomUUID(),
          recipe: recipeInput,
        });
      }

      set({ connected: true, cursor: payload.cursor });
    } catch {
      set({ connected: false });
    }
  },

  pullChanges: async () => {
    const { client, cursor } = get();
    if (!client || cursor === null) return;
    try {
      const payload = await client.syncChanges(cursor);
      if (payload.recipes.length > 0 || payload.deletedIds.length > 0) {
        const updatedRecipes = payload.recipes.map(toClientRecipe);
        useSaucerStore.getState().mergeServerChanges(updatedRecipes, payload.deletedIds);
      }
      set({ connected: true, cursor: payload.cursor });
    } catch {
      set({ connected: false });
    }
  },

  pushMutation: async (mutation) => {
    const { client } = get();
    if (!client) return;
    try {
      const payload = await client.push([mutation]);
      set({ connected: true, cursor: payload.cursor });
    } catch {
      set({ connected: false });
    }
  },
}));
