import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { AppStore } from "../src/store.js";
import type { Recipe, SyncPayload, TaxonomyDocument } from "../src/types.js";

function createStoreStub() {
  const taxonomyDocument: TaxonomyDocument = {
    taxonomy: {
      categories: [
        {
          id: "category-main",
          name: "Main",
          description: "Main dishes",
        },
      ],
      tags: [
        {
          id: "tag-main-dinner",
          categoryId: "category-main",
          name: "Dinner",
          aliases: [],
        },
      ],
    },
    revision: 2,
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  const syncPayload: SyncPayload = {
    recipes: [],
    deletedIds: [],
    cursor: "7",
  };

  const recipe: Recipe = {
    id: "recipe-1",
    title: "Tomato Soup",
    ingredients: [],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    revision: 1,
  };

  const getTaxonomy = vi.fn(async () => taxonomyDocument);
  const getSyncPayload = vi.fn(async () => syncPayload);
  const applyMutations = vi.fn(async () => syncPayload);
  const getRecipe = vi.fn(async () => recipe);
  const saveTaxonomy = vi.fn(async () => taxonomyDocument);

  const store: AppStore = {
    getTaxonomy,
    getSyncPayload,
    applyMutations,
    getRecipe,
    saveTaxonomy,
  };

  return {
    store,
    getTaxonomy,
    getSyncPayload,
    applyMutations,
    getRecipe,
    saveTaxonomy,
    taxonomyDocument,
    syncPayload,
    recipe,
  };
}

describe("createApp", () => {
  const verifyToken = vi.fn(async () => ({ sub: "user-123" }));
  const fetchImpl = vi.fn<typeof fetch>();

  beforeEach(() => {
    verifyToken.mockClear();
    fetchImpl.mockReset();
  });

  it("serves health checks without authentication", async () => {
    const { store } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .get("/api/health")
      .expect(200, { ok: true });

    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("rejects protected routes without a bearer token", async () => {
    const { store } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .get("/api/bootstrap")
      .expect(401, { error: "Missing Bearer token." });
  });

  it("returns bootstrap payloads for authenticated requests", async () => {
    const { store, getSyncPayload, getTaxonomy, taxonomyDocument, syncPayload } = createStoreStub();

    const response = await request(createApp({ store, verifyToken, fetchImpl }))
      .get("/api/bootstrap")
      .set("Authorization", "Bearer good-token")
      .expect(200);

    expect(verifyToken).toHaveBeenCalledWith("good-token");
    expect(getTaxonomy).toHaveBeenCalledWith("user-123");
    expect(getSyncPayload).toHaveBeenCalledWith("user-123");
    expect(response.body).toEqual({
      recipes: syncPayload.recipes,
      deletedIds: syncPayload.deletedIds,
      taxonomy: taxonomyDocument.taxonomy,
      taxonomyRevision: taxonomyDocument.revision,
      cursor: syncPayload.cursor,
    });
  });

  it("rejects invalid sync cursors", async () => {
    const { store, getSyncPayload } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .get("/api/sync/changes?cursor=not-a-number")
      .set("Authorization", "Bearer good-token")
      .expect(400, { error: "cursor must be a numeric string." });

    expect(getSyncPayload).not.toHaveBeenCalled();
  });

  it("rejects malformed mutation payloads", async () => {
    const { store, applyMutations } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .post("/api/sync/push")
      .set("Authorization", "Bearer good-token")
      .send({ mutations: [{ type: "upsertRecipe", clientMutationId: "m-1", recipe: {} }] })
      .expect(400, { error: "Recipe id is required." });

    expect(applyMutations).not.toHaveBeenCalled();
  });

  it("rejects malformed taxonomy payloads", async () => {
    const { store, saveTaxonomy } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .put("/api/taxonomy")
      .set("Authorization", "Bearer good-token")
      .send({
        categories: [{ id: "category-main", name: "Main", description: "Main dishes" }],
      })
      .expect(400, { error: "Taxonomy payload must include categories and tags arrays." });

    expect(saveTaxonomy).not.toHaveBeenCalled();
  });

  it("requires an uploaded image file", async () => {
    const { store } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .post("/api/images/upload")
      .set("Authorization", "Bearer good-token")
      .expect(400, { error: "Image upload is required." });
  });

  it("fetches website imports when the request body is valid", async () => {
    const { store } = createStoreStub();
    fetchImpl.mockResolvedValue({
      ok: true,
      status: 200,
      url: "https://example.com/recipe",
      text: async () => "<html>recipe</html>",
    } as Response);

    const response = await request(createApp({ store, verifyToken, fetchImpl }))
      .post("/api/import/website")
      .set("Authorization", "Bearer good-token")
      .send({ url: "https://example.com/recipe" })
      .expect(200);

    expect(fetchImpl).toHaveBeenCalledWith("https://example.com/recipe", {
      redirect: "follow",
      headers: {
        "User-Agent": "Saucer/0.1",
      },
    });
    expect(response.body).toEqual({
      url: "https://example.com/recipe",
      html: "<html>recipe</html>",
    });
  });

  it("rejects non-http website imports before fetching", async () => {
    const { store } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .post("/api/import/website")
      .set("Authorization", "Bearer good-token")
      .send({ url: "ftp://example.com/recipe" })
      .expect(400, { error: "A valid http(s) URL is required." });

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
