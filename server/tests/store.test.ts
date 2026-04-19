import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileAppStore } from "../src/store.js";

const createdFiles: string[] = [];

function createStore() {
  const filePath = path.join(process.cwd(), "tests", `.store-${randomUUID()}.json`);
  createdFiles.push(filePath);
  return new FileAppStore(filePath);
}

afterEach(async () => {
  await Promise.all(
    createdFiles.splice(0).map(async (filePath) => {
      await rm(filePath, { force: true });
    }),
  );
});

describe("FileAppStore", () => {
  it("deduplicates repeated client mutations", async () => {
    const store = createStore();

    await store.applyMutations("user-1", [
      {
        type: "upsertRecipe",
        clientMutationId: "mutation-1",
        recipe: {
          id: "recipe-1",
          title: "Weeknight Pasta",
          ingredients: [],
        },
      },
      {
        type: "upsertRecipe",
        clientMutationId: "mutation-1",
        recipe: {
          id: "recipe-1",
          title: "Weeknight Pasta",
          ingredients: [],
        },
      },
    ]);

    const payload = await store.getSyncPayload("user-1");

    expect(payload.recipes).toHaveLength(1);
    expect(payload.recipes[0]).toMatchObject({
      id: "recipe-1",
      title: "Weeknight Pasta",
      revision: 1,
    });
    expect(payload.cursor).toBe("1");
  });

  it("returns deleted ids when syncing from a cursor", async () => {
    const store = createStore();

    await store.saveRecipe("user-1", {
      id: "recipe-1",
      title: "Tomato Soup",
      ingredients: [],
    });

    const initialPayload = await store.getSyncPayload("user-1");

    await store.deleteRecipe("user-1", "recipe-1", 1);

    const changedPayload = await store.getSyncPayload("user-1", initialPayload.cursor);

    expect(changedPayload.recipes).toEqual([]);
    expect(changedPayload.deletedIds).toEqual(["recipe-1"]);
    expect(changedPayload.cursor).toBe("2");
  });
});
