import { create } from "zustand";

import type { Recipe, RecipeDraft, SourceType, Taxonomy } from "../../lib/models";
import { canUseTauri } from "../../lib/persistence";
import { stepIngredientMapFromSteps } from "../../lib/recipeSteps";
import {
  buildTagSuggestions,
  convertDraftToRecipe,
  createEmptyDraft,
  getAutoSelectedDraftTagIds,
} from "../../lib/taxonomy";
import { reconcileRecipeLinks, useSaucerStore } from "../saucer/useSaucerStore";
import { useStatusStore } from "../status/useStatusStore";
import { useTaxonomyUiStore } from "../taxonomy/useTaxonomyUiStore";
import {
  importRecipeDraftFromFile,
  importRecipeDraftsFromFile,
  importRecipeDraftsFromText,
  importRecipeDraftsFromWebsite,
} from "./recipeImportService";
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
    parsedDrafts: [] as RecipeDraft[],
    parsedDraftIndex: 0,
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
  importFromText: (text: string) => Promise<void>;
  toggleDraftTag: (tagId: string) => void;
  createDraftTag: (categoryId: string, inputValue: string) => Promise<void>;
  toggleDraftLinkedRecipe: (recipeId: string) => void;
  setDraftLinkedRecipes: (recipeIds: string[]) => void;
  goToParsedDraft: (index: number) => void;
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
      .map((step, index) => `${index + 1}. ${step.text}`)
      .join("\n"),
    servings: recipe.servings ?? "",
    cuisine: recipe.cuisine ?? "",
    mealType: recipe.mealType ?? "",
    selectedTagIds: recipe.tagIds,
    selectedLinkedRecipeIds: recipe.linkedRecipeIds ?? [],
    stepIngredientMap: stepIngredientMapFromSteps(recipe.instructions, recipe.ingredients),
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

function autoTagDraft(draft: RecipeDraft, taxonomy: Taxonomy): RecipeDraft {
  return {
    ...draft,
    selectedTagIds: getAutoSelectedDraftTagIds(buildSuggestions(draft, taxonomy)),
  };
}

function applyImportedDrafts(drafts: RecipeDraft[], sourceLabel: string) {
  const taxonomy = useSaucerStore.getState().taxonomy;
  const tagged = drafts.map((d) => autoTagDraft(d, taxonomy));

  if (tagged.length > 1) {
    useRecipeEditorStore.setState({
      draft: tagged[0],
      parsedDrafts: tagged,
      parsedDraftIndex: 0,
      draftImported: true,
      showSourceControls: false,
      uploadErrorActive: false,
      uploadShakeActive: false,
    });
    useStatusStore
      .getState()
      .updateStatus(`${sourceLabel} parsed into ${tagged.length} recipes.`, "success");
    return;
  }

  useRecipeEditorStore.setState({
    draft: tagged[0] ?? createEmptyDraft(),
    parsedDrafts: [],
    parsedDraftIndex: 0,
    draftImported: true,
    showSourceControls: false,
    uploadErrorActive: false,
    uploadShakeActive: false,
  });
  useStatusStore.getState().updateStatus(`${sourceLabel} imported into the review form.`, "success");
}

export const useRecipeEditorStore = create<RecipeEditorStoreState>((set, get) => ({
  ...createInitialState(),
  closeEditor: () => {
    useTaxonomyUiStore.getState().resetCategoryInputs("editor");
    set({ editorOpen: false, parsedDrafts: [], parsedDraftIndex: 0 });
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
      parsedDrafts: [],
      parsedDraftIndex: 0,
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
      parsedDrafts: [],
      parsedDraftIndex: 0,
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
      parsedDrafts: [],
      parsedDraftIndex: 0,
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
        ? (text: string, pageTitle?: string) =>
            connectedClient.extractRecipeTextMulti(text, pageTitle)
        : undefined;

      const fetchPage = connectedClient
        ? (url: string) => connectedClient.fetchWebsitePage(url)
        : undefined;

      const importedDrafts = await importRecipeDraftsFromWebsite(
        draft.sourceRef,
        extractText,
        fetchPage,
      );
      applyImportedDrafts(importedDrafts, "Website recipe");
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
        ? (dataUrl: string) => connectedClient.extractPhotoMulti(dataUrl)
        : undefined;
      const extractText = connectedClient
        ? (text: string) => connectedClient.extractRecipeTextMulti(text)
        : undefined;

      let importedDrafts: RecipeDraft[];
      if (draft.sourceType === "file" && extractPhoto) {
        try {
          importedDrafts = await importRecipeDraftsFromFile(
            file,
            draft.sourceType,
            extractPhoto,
          );
        } catch (apiErr) {
          useStatusStore.getState().updateStatus(
            `AI photo extraction failed — falling back to local OCR in 5 seconds. (${apiErr instanceof Error ? apiErr.message : "unknown"})`,
            "error",
          );
          set({ uploadShakeActive: true });
          setTimeout(() => useRecipeEditorStore.setState({ uploadShakeActive: false }), 600);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          importedDrafts = [await importRecipeDraftFromFile(file, draft.sourceType)];
        }
      } else {
        importedDrafts = await importRecipeDraftsFromFile(
          file,
          draft.sourceType,
          undefined,
          extractText,
        );
      }

      applyImportedDrafts(importedDrafts, file.name);
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
  importFromText: async (text) => {
    set({ isImporting: true, uploadErrorActive: false, uploadShakeActive: false });
    useStatusStore.getState().updateStatus("Importing pasted recipe text...", "info");

    try {
      const { useSyncStore } = await import("../sync/useSyncStore");
      const { client: syncClient, connected } = useSyncStore.getState();
      const connectedClient = connected ? syncClient : null;

      if (!connected) {
        set({ uploadErrorActive: true, uploadShakeActive: true });
        useStatusStore.getState().updateStatus("Server offline — importing with local processing.", "error");
        setTimeout(() => useRecipeEditorStore.setState({ uploadShakeActive: false }), 600);
      }

      const extractText = connectedClient
        ? (t: string) => connectedClient.extractRecipeTextMulti(t)
        : undefined;

      const importedDrafts = await importRecipeDraftsFromText(text, extractText);
      applyImportedDrafts(importedDrafts, "Recipe text");
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
  toggleDraftLinkedRecipe: (recipeId) =>
    set((state) => {
      const current = state.draft.selectedLinkedRecipeIds ?? [];
      const next = current.includes(recipeId)
        ? current.filter((id) => id !== recipeId)
        : [...current, recipeId];
      return { draft: { ...state.draft, selectedLinkedRecipeIds: next } };
    }),
  setDraftLinkedRecipes: (recipeIds) =>
    set((state) => ({
      draft: {
        ...state.draft,
        selectedLinkedRecipeIds: [...new Set(recipeIds)],
      },
    })),
  goToParsedDraft: (index) =>
    set((state) => {
      if (state.parsedDrafts.length <= 1) return state;
      if (index < 0 || index >= state.parsedDrafts.length) return state;
      const persisted = state.parsedDrafts.map((entry, i) =>
        i === state.parsedDraftIndex ? state.draft : entry,
      );
      return {
        ...state,
        parsedDrafts: persisted,
        parsedDraftIndex: index,
        draft: persisted[index],
      };
    }),
  saveDraft: async () => {
    const { draft, editorMode, parsedDrafts, parsedDraftIndex } = get();
    const { recipes, taxonomy, replaceAll } = useSaucerStore.getState();
    const { useSyncStore } = await import("../sync/useSyncStore");

    if (parsedDrafts.length > 1 && editorMode === "create") {
      const allDrafts = parsedDrafts.map((entry, i) => (i === parsedDraftIndex ? draft : entry));
      const newRecipes: Recipe[] = allDrafts.map((entry) => {
        const suggestions = buildSuggestions(entry, taxonomy);
        const autoTagIds = getAutoSelectedDraftTagIds(suggestions);
        return convertDraftToRecipe({
          ...entry,
          selectedTagIds: entry.selectedTagIds.length > 0 ? entry.selectedTagIds : autoTagIds,
        });
      });

      const newIds = newRecipes.map((r) => r.id);
      const linked: Recipe[] = newRecipes.map((r) => ({
        ...r,
        linkedRecipeIds: [
          ...new Set([
            ...r.linkedRecipeIds,
            ...newIds.filter((id) => id !== r.id),
          ]),
        ],
      }));

      for (const r of linked) {
        if (!recipes.find((existing) => existing.id === r.id)) {
          useSaucerStore.getState().markRecipeAsLocal(r.id);
        }
      }

      const { recipes: reconciledRecipes, touchedIds } = reconcileRecipeLinks(recipes, linked);

      await replaceAll(
        reconciledRecipes,
        taxonomy,
        `${linked.length} recipes created and linked.`,
      );

      const { recipeToApiInput } = await import("../sync/useSyncStore");
      for (const id of touchedIds) {
        const updated = reconciledRecipes.find((r) => r.id === id);
        if (!updated) continue;
        void useSyncStore.getState().pushMutation({
          type: "upsertRecipe",
          clientMutationId: crypto.randomUUID(),
          recipe: recipeToApiInput(updated),
        });
      }

      useTaxonomyUiStore.getState().resetCategoryInputs("editor");
      set({
        editorOpen: false,
        draft: createEmptyDraft(),
        draftImported: false,
        showSourceControls: true,
        uploadErrorActive: false,
        isImporting: false,
        parsedDrafts: [],
        parsedDraftIndex: 0,
      });
      return;
    }

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

    const seedRecipes = existingRecipe
      ? recipes.map((recipe) => (recipe.id === nextRecipe.id ? nextRecipe : recipe))
      : [nextRecipe, ...recipes];

    const { recipes: reconciledRecipes, touchedIds } = reconcileRecipeLinks(seedRecipes, [
      nextRecipe,
    ]);

    if (!existingRecipe) {
      useSaucerStore.getState().markRecipeAsLocal(nextRecipe.id);
    }

    await replaceAll(
      reconciledRecipes,
      taxonomy,
      editorMode === "edit" ? "Recipe updated." : "Recipe created and indexed.",
    );

    const { recipeToApiInput } = await import("../sync/useSyncStore");
    for (const id of touchedIds) {
      const updated = reconciledRecipes.find((r) => r.id === id);
      if (!updated) continue;
      void useSyncStore.getState().pushMutation({
        type: "upsertRecipe",
        clientMutationId: crypto.randomUUID(),
        recipe: recipeToApiInput(updated),
      });
    }

    useTaxonomyUiStore.getState().resetCategoryInputs("editor");
    set({
      editorOpen: false,
      draft: createEmptyDraft(),
      draftImported: false,
      showSourceControls: true,
      uploadErrorActive: false,
      isImporting: false,
      parsedDrafts: [],
      parsedDraftIndex: 0,
    });
  },
  reset: () => set(createInitialState()),
}));

export function resetRecipeEditorStore() {
  useRecipeEditorStore.getState().reset();
}
