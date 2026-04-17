import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSaucerStore } from "../features/saucer/useSaucerStore";
import { useRecipeEditorStore } from "../features/editor/useRecipeEditorStore";
import type { RecipeEditorMode } from "../features/editor/types";
import type { Recipe, RecipeDraft, SourceType, TagSuggestion } from "../lib/models";
import {
  buildTagSuggestions,
  filterDraftSuggestionsByConfidence,
  getVisibleDraftTagIds,
} from "../lib/taxonomy";

export type { RecipeEditorMode };

export type RecipeEditorContextValue = {
  editorOpen: boolean;
  editorMode: RecipeEditorMode;
  draft: RecipeDraft;
  draftImported: boolean;
  showSourceControls: boolean;
  uploadErrorActive: boolean;
  isImporting: boolean;
  visibleDraftSuggestions: TagSuggestion[];
  visibleEditableTagIds: string[];
  showSourceSelector: boolean;
  showImportControls: boolean;
  showDraftForm: boolean;
  closeEditor: () => void;
  openCreateEditor: (sourceType: SourceType) => void;
  openEditEditor: (recipe: Recipe) => void;
  updateDraft: (patch: Partial<RecipeDraft>) => void;
  clearUploadError: () => void;
  revealSourceControls: () => void;
  selectSourceType: (sourceType: SourceType) => void;
  importFromWebsite: () => Promise<void>;
  importFromFile: (file: File | undefined) => Promise<void>;
  toggleDraftTag: (tagId: string) => void;
  createDraftTag: (categoryId: string, tagName: string) => Promise<void>;
  saveDraft: () => Promise<void>;
};

export function useRecipeEditorContext(): RecipeEditorContextValue {
  const taxonomy = useSaucerStore((state) => state.taxonomy);
  const state = useRecipeEditorStore(
    useShallow((store) => ({
      editorOpen: store.editorOpen,
      editorMode: store.editorMode,
      draft: store.draft,
      draftImported: store.draftImported,
      showSourceControls: store.showSourceControls,
      uploadErrorActive: store.uploadErrorActive,
      isImporting: store.isImporting,
      closeEditor: store.closeEditor,
      openCreateEditor: store.openCreateEditor,
      openEditEditor: store.openEditEditor,
      updateDraft: store.updateDraft,
      clearUploadError: store.clearUploadError,
      revealSourceControls: store.revealSourceControls,
      selectSourceType: store.selectSourceType,
      importFromWebsite: store.importFromWebsite,
      importFromFile: store.importFromFile,
      toggleDraftTag: store.toggleDraftTag,
      createDraftTag: store.createDraftTag,
      saveDraft: store.saveDraft,
    })),
  );

  return useMemo(() => {
    const draftSuggestions = buildTagSuggestions(
      {
        title: state.draft.title,
        summary: state.draft.summary,
        mealType: state.draft.mealType,
        cuisine: state.draft.cuisine,
        ingredientsText: state.draft.ingredientsText,
        instructionsText: state.draft.instructionsText,
      },
      taxonomy,
    );
    const visibleDraftSuggestions = filterDraftSuggestionsByConfidence(draftSuggestions);
    const visibleEditableTagIds = getVisibleDraftTagIds(state.draft.selectedTagIds, draftSuggestions);
    const showSourceSelector =
      state.editorMode === "create" && (state.draft.sourceType === "manual" || state.showSourceControls);
    const showImportControls =
      state.editorMode === "create" && state.draft.sourceType !== "manual" && state.showSourceControls;
    const showDraftForm =
      state.editorMode === "edit" || state.draft.sourceType === "manual" || state.draftImported;

    return {
      ...state,
      visibleDraftSuggestions,
      visibleEditableTagIds,
      showSourceSelector,
      showImportControls,
      showDraftForm,
    };
  }, [state, taxonomy]);
}
