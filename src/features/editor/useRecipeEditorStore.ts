import { create } from "zustand";

import type { Recipe, RecipeDraft, SourceType, Taxonomy } from "../../lib/models";
import { canUseTauri } from "../../lib/persistence";
import {
  buildTagSuggestions,
  convertDraftToRecipe,
  createEmptyDraft,
  getAutoSelectedDraftTagIds,
} from "../../lib/taxonomy";
import { useSaucerStore } from "../saucer/useSaucerStore";
import { useStatusStore } from "../status/useStatusStore";
import { useTaxonomyUiStore } from "../taxonomy/useTaxonomyUiStore";
import { importRecipeDraftFromFile, importRecipeDraftFromWebsite } from "./recipeImportService";
import type { RecipeEditorMode } from "./types";

function createInitialState() {
  return {
    editorOpen: false,
    editorMode: "create" as RecipeEditorMode,
    draft: createEmptyDraft(),
    draftImported: false,
    showSourceControls: true,
    uploadErrorActive: false,
    uploadShakeActive: false,
    isImporting: false,
  };
}

type RecipeEditorStoreState = ReturnType<typeof createInitialState> & {
  closeEditor: () => void;
  openCreateEditor: (sourceType: SourceType) => void;
  openEditEditor: (recipe: Recipe) => void;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
  clearUploadError: () => void;
  clearUploadShake: () => void;
  revealSourceControls: () => void;
  selectSourceType: (sourceType: SourceType) => void;
  importFromWebsite: () => Promise<void>;
  importFromFile: (file: File | undefined) => Promise<void>;
  toggleDraftTag: (tagId: string) => void;
  createDraftTag: (categoryId: string, inputValue: string) => Promise<void>;
  saveDraft: () => Promise<void>;
  reset: () => void;
};

function toDraft(recipe: Recipe): RecipeDraft {
  return {
    id: recipe.id,
    title: recipe.title,
    summary: recipe.summary,
    sourceType: recipe.sourceType,
    sourceRef: recipe.sourceRef ?? "",
    heroImage: recipe.heroImage,
    ingredientsText: recipe.ingredients.map((ingredient) => ingredient.raw).join("\n"),
    instructionsText: recipe.instructions
      .map((instruction, index) => `${index + 1}. ${instruction}`)
      .join("\n"),
    servings: recipe.servings ?? "",
    cuisine: recipe.cuisine ?? "",
    mealType: recipe.mealType ?? "",
    selectedTagIds: recipe.tagIds,
  };
}

function buildSuggestions(draft: RecipeDraft, taxonomy: Taxonomy) {
  return buildTagSuggestions(
    {
      title: draft.title,
      summary: draft.summary,
      mealType: draft.mealType,
      cuisine: draft.cuisine,
      ingredientsText: draft.ingredientsText,
      instructionsText: draft.instructionsText,
    },
    taxonomy,
  );
}

export const useRecipeEditorStore = create<RecipeEditorStoreState>((set, get) => ({
  ...createInitialState(),
  closeEditor: () => {
    useTaxonomyUiStore.getState().resetCategoryInputs("editor");
    set({ editorOpen: false });
  },
  openCreateEditor: (sourceType) => {
    useTaxonomyUiStore.getState().resetCategoryInputs("editor");
    set({
      editorMode: "create",
      draft: createEmptyDraft(sourceType),
      editorOpen: true,
      draftImported: false,
      showSourceControls: true,
      uploadErrorActive: false,
      isImporting: false,
    });
    useStatusStore
      .getState()
      .updateStatus(
        sourceType === "manual"
          ? "Manual recipe entry ready."
          : "Choose a source and import your recipe draft.",
        "info",
      );
  },
  openEditEditor: (recipe) => {
    useTaxonomyUiStore.getState().resetCategoryInputs("editor");
    set({
      editorMode: "edit",
      draft: toDraft(recipe),
      editorOpen: true,
      draftImported: true,
      showSourceControls: false,
      uploadErrorActive: false,
      isImporting: false,
    });
    useStatusStore.getState().updateStatus(`Editing ${recipe.title}.`, "info");
  },
  updateDraft: (patch) =>
    set((state) => ({
      draft: {
        ...state.draft,
        ...patch,
      },
    })),
  clearUploadError: () => set({ uploadErrorActive: false }),
  clearUploadShake: () => set({ uploadShakeActive: false }),
  revealSourceControls: () => {
    set({
      showSourceControls: true,
      uploadErrorActive: false,
    });
    useStatusStore.getState().updateStatus("Choose a new source to replace this imported draft.", "info");
  },
  selectSourceType: (sourceType) => {
    useTaxonomyUiStore.getState().resetCategoryInputs("editor");
    set({
      uploadErrorActive: false,
      draftImported: false,
      isImporting: false,
      showSourceControls: true,
      draft: createEmptyDraft(sourceType),
    });
    useStatusStore
      .getState()
      .updateStatus(
        sourceType === "manual" ? "Manual recipe entry ready." : `Ready to import from ${sourceType}.`,
        "info",
      );
  },
  importFromWebsite: async () => {
    const { draft } = get();
    set({ isImporting: true, uploadErrorActive: false, uploadShakeActive: false });
    useStatusStore.getState().updateStatus("Importing recipe from website...", "info");

    try {
      const { useSyncStore } = await import("../sync/useSyncStore");
      const { client: syncClient, connected } = useSyncStore.getState();
      const connectedClient = connected ? syncClient : null;

      if (!connected) {
        if (!canUseTauri()) {
          set({ uploadErrorActive: true, uploadShakeActive: true, isImporting: false });
          useStatusStore.getState().updateStatus("Connect to the server to import from websites.", "error");
          setTimeout(() => useRecipeEditorStore.setState({ uploadShakeActive: false }), 600);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return;
        }
        set({ uploadErrorActive: true, uploadShakeActive: true });
        useStatusStore.getState().updateStatus("Server offline — parsing website locally.", "error");
        setTimeout(() => useRecipeEditorStore.setState({ uploadShakeActive: false }), 600);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      const extractText = connectedClient
        ? (text: string, pageTitle?: string) => connectedClient.extractRecipeText(text, pageTitle)
        : undefined;

      const fetchPage = connectedClient
        ? (url: string) => connectedClient.fetchWebsitePage(url)
        : undefined;

      const importedDraft = await importRecipeDraftFromWebsite(draft.sourceRef, extractText, fetchPage);
      const taxonomy = useSaucerStore.getState().taxonomy;
      const autoSelectedTagIds = getAutoSelectedDraftTagIds(buildSuggestions(importedDraft, taxonomy));

      set({
        draft: { ...importedDraft, selectedTagIds: autoSelectedTagIds },
        draftImported: true,
        showSourceControls: false,
        uploadErrorActive: false,
        uploadShakeActive: false,
      });
      useStatusStore.getState().updateStatus("Website recipe imported into the review form.", "success");
    } catch (error) {
      set({ uploadErrorActive: true, uploadShakeActive: true });
      useStatusStore.getState().updateStatus(
        `Website import failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
      setTimeout(() => useRecipeEditorStore.setState({ uploadShakeActive: false }), 600);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } finally {
      set({ isImporting: false });
    }
  },
  importFromFile: async (file) => {
    if (!file) {
      return;
    }

    const { draft } = get();
    set({ isImporting: true, uploadErrorActive: false, uploadShakeActive: false });
    useStatusStore.getState().updateStatus(`Importing ${file.name}...`, "info");

    try {
      const { useSyncStore } = await import("../sync/useSyncStore");
      const { client: syncClient, connected } = useSyncStore.getState();
      const connectedClient = connected ? syncClient : null;

      if (!connected) {
        set({ uploadErrorActive: true, uploadShakeActive: true });
        useStatusStore.getState().updateStatus("Server offline — importing with local processing.", "error");
        setTimeout(() => useRecipeEditorStore.setState({ uploadShakeActive: false }), 600);
      }

      const extractPhoto = connectedClient
        ? (dataUrl: string) => connectedClient.extractPhoto(dataUrl)
        : undefined;
      const extractText = connectedClient
        ? (text: string) => connectedClient.extractRecipeText(text)
        : undefined;

      let importedDraft: RecipeDraft;
      if (draft.sourceType === "photo" && extractPhoto) {
        try {
          importedDraft = await importRecipeDraftFromFile(file, draft.sourceType, extractPhoto);
        } catch (apiErr) {
          useStatusStore.getState().updateStatus(
            `AI photo extraction failed — falling back to local OCR in 5 seconds. (${apiErr instanceof Error ? apiErr.message : "unknown"})`,
            "error",
          );
          set({ uploadShakeActive: true });
          setTimeout(() => useRecipeEditorStore.setState({ uploadShakeActive: false }), 600);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          importedDraft = await importRecipeDraftFromFile(file, draft.sourceType);
        }
      } else {
        importedDraft = await importRecipeDraftFromFile(file, draft.sourceType, undefined, extractText);
      }

      const taxonomy = useSaucerStore.getState().taxonomy;
      const autoSelectedTagIds = getAutoSelectedDraftTagIds(buildSuggestions(importedDraft, taxonomy));

      set({
        draft: { ...importedDraft, selectedTagIds: autoSelectedTagIds },
        draftImported: true,
        showSourceControls: false,
        uploadErrorActive: false,
        uploadShakeActive: false,
      });
      useStatusStore.getState().updateStatus(`${file.name} imported into the review form.`, "success");
    } catch (error) {
      set({ uploadErrorActive: true, uploadShakeActive: true });
      useStatusStore.getState().updateStatus(
        `Import failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error",
      );
      setTimeout(() => useRecipeEditorStore.setState({ uploadShakeActive: false }), 600);
    } finally {
      set({ isImporting: false });
    }
  },
  toggleDraftTag: (tagId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        selectedTagIds: state.draft.selectedTagIds.includes(tagId)
          ? state.draft.selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId)
          : [...state.draft.selectedTagIds, tagId],
      },
    })),
  createDraftTag: async (categoryId, inputValue) => {
    const trimmedName = inputValue.trim();
    if (!trimmedName) {
      useStatusStore.getState().updateStatus("Enter a tag name before adding it to the recipe.", "error");
      return;
    }

    const createdTagId = await useSaucerStore.getState().addDraftTag(categoryId, trimmedName);
    if (createdTagId) {
      set((state) => ({
        draft: {
          ...state.draft,
          selectedTagIds: state.draft.selectedTagIds.includes(createdTagId)
            ? state.draft.selectedTagIds
            : [...state.draft.selectedTagIds, createdTagId],
        },
      }));
    }

    useTaxonomyUiStore.getState().setCategoryInput("editor", categoryId, "");
  },
  saveDraft: async () => {
    const { draft, editorMode } = get();
    const { recipes, taxonomy, replaceAll } = useSaucerStore.getState();
    const draftSuggestions = buildSuggestions(draft, taxonomy);
    const autoTagIds = getAutoSelectedDraftTagIds(draftSuggestions);
    const baseRecipe = convertDraftToRecipe({
      ...draft,
      selectedTagIds: draft.selectedTagIds.length > 0 ? draft.selectedTagIds : autoTagIds,
    });

    const existingRecipe = recipes.find((recipe) => recipe.id === baseRecipe.id);
    const nextRecipe: Recipe = existingRecipe
      ? {
          ...existingRecipe,
          ...baseRecipe,
          createdAt: existingRecipe.createdAt,
          rating: existingRecipe.rating,
          updatedAt: new Date().toISOString(),
        }
      : baseRecipe;

    const nextRecipes = existingRecipe
      ? recipes.map((recipe) => (recipe.id === nextRecipe.id ? nextRecipe : recipe))
      : [nextRecipe, ...recipes];

    if (!existingRecipe) {
      useSaucerStore.getState().markRecipeAsLocal(nextRecipe.id);
    }

    await replaceAll(
      nextRecipes,
      taxonomy,
      editorMode === "edit" ? "Recipe updated." : "Recipe created and indexed.",
    );

    const { createdAt: _ca, updatedAt: _ua, revision: _rev, ...recipeInput } = nextRecipe;
    const { useSyncStore } = await import("../sync/useSyncStore");
    void useSyncStore.getState().pushMutation({
      type: "upsertRecipe",
      clientMutationId: crypto.randomUUID(),
      recipe: recipeInput,
    });

    useTaxonomyUiStore.getState().resetCategoryInputs("editor");
    set({
      editorOpen: false,
      draft: createEmptyDraft(),
      draftImported: false,
      showSourceControls: true,
      uploadErrorActive: false,
      isImporting: false,
    });
  },
  reset: () => set(createInitialState()),
}));

export function resetRecipeEditorStore() {
  useRecipeEditorStore.getState().reset();
}
