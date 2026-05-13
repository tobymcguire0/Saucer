import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { anthropicCreateMock } = vi.hoisted(() => ({
  anthropicCreateMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: anthropicCreateMock,
    },
  })),
}));

import { createApp } from "../src/app.js";
import type { AppStore } from "../src/store.js";
import type { Recipe, SyncPayload, TaxonomyDocument } from "../src/types.js";

const VALID_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

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
    anthropicCreateMock.mockReset();
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

  it("rejects sync endpoints without X-Client-Id", async () => {
    const { store } = createStoreStub();
    const app = createApp({ store, verifyToken, fetchImpl });

    await request(app)
      .get("/api/bootstrap")
      .set("Authorization", "Bearer good-token")
      .expect(400, { error: "X-Client-Id header is required." });

    await request(app)
      .get("/api/sync/changes")
      .set("Authorization", "Bearer good-token")
      .expect(400, { error: "X-Client-Id header is required." });

    await request(app)
      .post("/api/sync/push")
      .set("Authorization", "Bearer good-token")
      .send({ mutations: [] })
      .expect(400, { error: "X-Client-Id header is required." });
  });

  it("returns bootstrap payloads for authenticated requests", async () => {
    const { store, getSyncPayload, getTaxonomy, taxonomyDocument, syncPayload } = createStoreStub();

    const response = await request(createApp({ store, verifyToken, fetchImpl }))
      .get("/api/bootstrap")
      .set("Authorization", "Bearer good-token")
      .set("X-Client-Id", "device-abc")
      .expect(200);

    expect(verifyToken).toHaveBeenCalledWith("good-token");
    expect(getTaxonomy).toHaveBeenCalledWith("user-123");
    expect(getSyncPayload).toHaveBeenCalledWith("user-123", "device-abc");
    expect(response.body).toEqual({
      recipes: syncPayload.recipes,
      deletedIds: syncPayload.deletedIds,
      taxonomy: taxonomyDocument.taxonomy,
      taxonomyRevision: taxonomyDocument.revision,
      cursor: syncPayload.cursor,
    });
  });

  it("returns taxonomy updates from sync changes when the client revision is stale", async () => {
    const { store, getSyncPayload, taxonomyDocument, syncPayload } = createStoreStub();
    syncPayload.taxonomy = taxonomyDocument.taxonomy;
    syncPayload.taxonomyRevision = taxonomyDocument.revision;

    const response = await request(createApp({ store, verifyToken, fetchImpl }))
      .get("/api/sync/changes?cursor=7&taxonomyRevision=1")
      .set("Authorization", "Bearer good-token")
      .set("X-Client-Id", "device-abc")
      .expect(200);

    expect(getSyncPayload).toHaveBeenCalledWith("user-123", "device-abc", "7", 1);
    expect(response.body).toEqual(syncPayload);
  });

  it("rejects invalid sync cursors", async () => {
    const { store, getSyncPayload } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .get("/api/sync/changes?cursor=not-a-number")
      .set("Authorization", "Bearer good-token")
      .set("X-Client-Id", "device-abc")
      .expect(400, { error: "cursor must be a numeric string." });

    expect(getSyncPayload).not.toHaveBeenCalled();
  });

  it("rejects invalid taxonomy revisions in sync requests", async () => {
    const { store, getSyncPayload } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .get("/api/sync/changes?taxonomyRevision=not-a-number")
      .set("Authorization", "Bearer good-token")
      .set("X-Client-Id", "device-abc")
      .expect(400, { error: "taxonomyRevision must be a numeric string." });

    expect(getSyncPayload).not.toHaveBeenCalled();
  });

  it("rejects malformed mutation payloads", async () => {
    const { store, applyMutations } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl }))
      .post("/api/sync/push")
      .set("Authorization", "Bearer good-token")
      .set("X-Client-Id", "device-abc")
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

  it("rejects photo extraction requests with invalid image payloads", async () => {
    const { store } = createStoreStub();

    await request(createApp({ store, verifyToken, fetchImpl, anthropicApiKey: "test-key" }))
      .post("/api/extract-photo")
      .set("Authorization", "Bearer good-token")
      .send({ imageDataUrl: "data:image/png;base64,not-a-real-image" })
      .expect(400, { error: "imageDataUrl must contain a valid image." });

    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it("maps photo extraction provider failures to a stable JSON response", async () => {
    const { store } = createStoreStub();
    anthropicCreateMock.mockRejectedValue({
      status: 529,
      message: "load failed",
    });

    await request(createApp({ store, verifyToken, fetchImpl, anthropicApiKey: "test-key" }))
      .post("/api/extract-photo")
      .set("Authorization", "Bearer good-token")
      .send({ imageDataUrl: VALID_IMAGE_DATA_URL })
      .expect(502, {
        error: "Photo extraction failed: load failed",
        providerStatus: 529,
      });
  });

  it("returns parsed photo extraction payloads when the provider succeeds", async () => {
    const { store } = createStoreStub();
    anthropicCreateMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            title: "Toast",
            summary: "Simple toast.",
            ingredients: ["2 slices bread"],
            instructions: ["Toast the bread."],
            servings: "1 serving",
            cuisine: "",
            mealType: "Breakfast",
          }),
        },
      ],
    });

    const response = await request(
      createApp({ store, verifyToken, fetchImpl, anthropicApiKey: "test-key" }),
    )
      .post("/api/extract-photo")
      .set("Authorization", "Bearer good-token")
      .send({ imageDataUrl: VALID_IMAGE_DATA_URL })
      .expect(200);

    expect(response.body).toEqual({
      title: "Toast",
      summary: "Simple toast.",
      ingredients: ["2 slices bread"],
      instructions: ["Toast the bread."],
      servings: "1 serving",
      cuisine: "",
      mealType: "Breakfast",
    });
    expect(anthropicCreateMock).toHaveBeenCalledOnce();
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

  it("returns a recipes array from /api/extract-recipe-text-multi when the model emits multiple recipes", async () => {
    const { store } = createStoreStub();
    anthropicCreateMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            recipes: [
              {
                title: "Cake",
                summary: "Sponge cake.",
                ingredients: ["flour"],
                instructions: ["Bake."],
                servings: "8",
                cuisine: "",
                mealType: "Dessert",
              },
              {
                title: "Icing",
                summary: "Cream icing.",
                ingredients: ["butter"],
                instructions: ["Mix."],
                servings: "",
                cuisine: "",
                mealType: "",
              },
            ],
          }),
        },
      ],
    });

    const response = await request(
      createApp({ store, verifyToken, fetchImpl, anthropicApiKey: "test-key" }),
    )
      .post("/api/extract-recipe-text-multi")
      .set("Authorization", "Bearer good-token")
      .send({ text: "Cake and icing." })
      .expect(200);

    expect(response.body.recipes).toHaveLength(2);
    expect(response.body.recipes[0].title).toBe("Cake");
    expect(response.body.recipes[1].title).toBe("Icing");
  });

  it("wraps a single-recipe model response into a recipes array", async () => {
    const { store } = createStoreStub();
    anthropicCreateMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            title: "Toast",
            summary: "Simple toast.",
            ingredients: ["2 slices bread"],
            instructions: ["Toast it."],
            servings: "1",
            cuisine: "",
            mealType: "Breakfast",
          }),
        },
      ],
    });

    const response = await request(
      createApp({ store, verifyToken, fetchImpl, anthropicApiKey: "test-key" }),
    )
      .post("/api/extract-photo-multi")
      .set("Authorization", "Bearer good-token")
      .send({ imageDataUrl: VALID_IMAGE_DATA_URL })
      .expect(200);

    expect(response.body.recipes).toHaveLength(1);
    expect(response.body.recipes[0].title).toBe("Toast");
  });
});
