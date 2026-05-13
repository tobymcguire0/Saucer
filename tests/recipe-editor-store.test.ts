// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  importRecipeDraftFromFileMock,
  importRecipeDraftsFromFileMock,
  importRecipeDraftsFromWebsiteMock,
  importRecipeDraftsFromTextMock,
  invokeMock,
} = vi.hoisted(() => ({
  importRecipeDraftFromFileMock: vi.fn(),
  importRecipeDraftsFromFileMock: vi.fn(),
  importRecipeDraftsFromWebsiteMock: vi.fn(),
  importRecipeDraftsFromTextMock: vi.fn(),
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("../src/features/editor/recipeImportService", () => ({
  importRecipeDraftFromFile: importRecipeDraftFromFileMock,
  importRecipeDraftsFromFile: importRecipeDraftsFromFileMock,
  importRecipeDraftsFromWebsite: importRecipeDraftsFromWebsiteMock,
  importRecipeDraftsFromText: importRecipeDraftsFromTextMock,
}));

import { ApiClient } from "../src/lib/apiClient";
import { resetRecipeEditorStore, useRecipeEditorStore } from "../src/features/editor/useRecipeEditorStore";
import { resetSaucerStore } from "../src/features/saucer/useSaucerStore";
import { resetStatusStore, useStatusStore } from "../src/features/status/useStatusStore";
import { useSyncStore } from "../src/features/sync/useSyncStore";
import { resetTaxonomyUiStore } from "../src/features/taxonomy/useTaxonomyUiStore";
import type { RecipeDraft } from "../src/lib/models";

const importedPhotoDraft: RecipeDraft = {
  title: "Toast",
  summary: "Simple toast.",
  sourceType: "file",
  sourceRef: "toast.png",
  heroImage: "data:image/png;base64,abc",
  ingredientsText: "2 slices bread",
  instructionsText: "1. Toast the bread.",
  servings: "1 serving",
  cuisine: "",
  mealType: "Breakfast",
  selectedTagIds: [],
  selectedLinkedRecipeIds: [],
};

describe("useRecipeEditorStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    importRecipeDraftFromFileMock.mockReset();
    importRecipeDraftsFromFileMock.mockReset();
    importRecipeDraftsFromWebsiteMock.mockReset();
    importRecipeDraftsFromTextMock.mockReset();
    invokeMock.mockReset();
    resetRecipeEditorStore();
    resetSaucerStore();
    resetStatusStore();
    resetTaxonomyUiStore();
    useSyncStore.setState({ connected: false, cursor: null, client: null });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("skips remote photo extraction when sync is disconnected", async () => {
    importRecipeDraftsFromFileMock.mockResolvedValue([importedPhotoDraft]);

    useSyncStore.getState().setClient(new ApiClient(() => "token"));
    useSyncStore.getState().setConnected(false);
    useRecipeEditorStore.getState().openCreateEditor("file");

    const file = new File(["fake-image"], "toast.png", { type: "image/png" });
    await useRecipeEditorStore.getState().importFromFile(file);

    expect(importRecipeDraftsFromFileMock).toHaveBeenCalledTimes(1);
    expect(importRecipeDraftsFromFileMock).toHaveBeenCalledWith(file, "file", undefined, undefined);
    expect(useStatusStore.getState().statusMessage).toBe("toast.png imported into the review form.");
  });

  it("imports multiple recipes from a single source into parsedDrafts", async () => {
    const secondDraft: RecipeDraft = { ...importedPhotoDraft, title: "Icing" };
    importRecipeDraftsFromTextMock.mockResolvedValue([importedPhotoDraft, secondDraft]);

    useRecipeEditorStore.getState().openCreateEditor("text");
    await useRecipeEditorStore.getState().importFromText("two recipes");

    const state = useRecipeEditorStore.getState();
    expect(state.parsedDrafts).toHaveLength(2);
    expect(state.parsedDraftIndex).toBe(0);
    expect(state.draft.title).toBe("Toast");
  });
});
