// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../src/lib/apiClient";
import type { Taxonomy } from "../src/lib/models";
import { getRecipeStore } from "../src/features/saucer/recipeStore";
import { resetSaucerStore, useSaucerStore } from "../src/features/saucer/useSaucerStore";
import { resetStatusStore } from "../src/features/status/useStatusStore";
import { resetSyncStore, useSyncStore } from "../src/features/sync/useSyncStore";
import { resetTaxonomyUiStore } from "../src/features/taxonomy/useTaxonomyUiStore";

describe("taxonomy sync", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSaucerStore();
    resetStatusStore();
    resetSyncStore();
    resetTaxonomyUiStore();
  });

  it("syncs taxonomy changes to the server when a connected client saves a tag", async () => {
    const saveTaxonomy = vi.fn(async (taxonomy: Taxonomy) => ({
      taxonomy,
      revision: 5,
      updatedAt: "2025-01-01T00:00:00.000Z",
    }));

    useSyncStore.setState({
      connected: true,
      cursor: "7",
      taxonomyRevision: 2,
      client: { saveTaxonomy } as unknown as ApiClient,
    });

    const categoryId = useSaucerStore
      .getState()
      .taxonomy.categories.find((category) => category.name === "Ingredients")?.id;

    expect(categoryId).toBeTruthy();

    await useSaucerStore.getState().saveTag(categoryId as string, "Butter");

    expect(saveTaxonomy).toHaveBeenCalledOnce();
    const savedTaxonomy = saveTaxonomy.mock.calls[0][0] as Taxonomy;
    expect(savedTaxonomy.tags.some((tag) => tag.categoryId === categoryId && tag.name === "Butter")).toBe(true);
    expect(useSyncStore.getState().taxonomyRevision).toBe(5);
  });

  it("applies taxonomy updates received during pullChanges", async () => {
    const syncChanges = vi.fn(async () => ({
      recipes: [],
      deletedIds: [],
      cursor: "8",
      taxonomy: {
        categories: [
          {
            id: "category-ingredients",
            name: "Ingredients",
            description: "Ingredient tags",
          },
        ],
        tags: [
          {
            id: "tag-category-ingredients-butter",
            categoryId: "category-ingredients",
            name: "Butter",
            aliases: [],
          },
        ],
      },
      taxonomyRevision: 4,
    }));

    useSyncStore.setState({
      connected: true,
      cursor: "7",
      taxonomyRevision: 1,
      client: { syncChanges } as unknown as ApiClient,
    });

    await useSyncStore.getState().pullChanges();

    expect(syncChanges).toHaveBeenCalledWith("7", 1);
    expect(useSaucerStore.getState().taxonomy.tags.find((tag) => tag.name === "Butter")).toBeTruthy();
    expect(useSyncStore.getState().taxonomyRevision).toBe(4);

    const snapshot = await getRecipeStore().load();
    expect(snapshot.taxonomy.tags.find((tag) => tag.name === "Butter")).toBeTruthy();
  });

  it("pushes local-only taxonomy entries to the server during bootstrap", async () => {
    const localCategoryId = useSaucerStore
      .getState()
      .taxonomy.categories.find((category) => category.name === "Ingredients")?.id;

    expect(localCategoryId).toBeTruthy();

    await useSaucerStore.getState().saveTag(localCategoryId as string, "Butter");

    const bootstrap = vi.fn(async () => ({
      recipes: [],
      deletedIds: [],
      cursor: "10",
      taxonomy: {
        categories: [
          {
            id: "category-ingredients",
            name: "Ingredients",
            description: "Ingredient tags",
          },
        ],
        tags: [],
      },
      taxonomyRevision: 2,
    }));
    const saveTaxonomy = vi.fn(async (taxonomy: Taxonomy) => ({
      taxonomy,
      revision: 3,
      updatedAt: "2025-01-01T00:00:00.000Z",
    }));
    const push = vi.fn(async () => ({ recipes: [], deletedIds: [], cursor: "10" }));

    useSyncStore.setState({
      connected: false,
      cursor: null,
      taxonomyRevision: 0,
      client: { bootstrap, saveTaxonomy, push } as unknown as ApiClient,
    });

    await useSyncStore.getState().bootstrap();

    expect(saveTaxonomy).toHaveBeenCalledOnce();
    const syncedTaxonomy = saveTaxonomy.mock.calls[0][0] as Taxonomy;
    expect(syncedTaxonomy.tags.find((tag) => tag.name === "Butter")).toBeTruthy();
    expect(useSyncStore.getState().taxonomyRevision).toBe(3);
  });
});
