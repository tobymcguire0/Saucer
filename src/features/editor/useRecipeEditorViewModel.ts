import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSaucerStore } from "../saucer/useSaucerStore";
import { useRecipeEditorStore } from "./useRecipeEditorStore";
import {
  buildTagSuggestions,
  filterDraftSuggestionsByConfidence,
  getVisibleDraftTagIds,
} from "../../lib/taxonomy";

export function useRecipeEditorActions() {
  return useRecipeEditorStore(
    useShallow((state) => ({
      openCreateEditor: state.openCreateEditor,
      openEditEditor: state.openEditEditor,
    })),
  );
}

export function useRecipeEditorViewModel() {
  const taxonomy = useSaucerStore((state) => state.taxonomy);
  const state = useRecipeEditorStore(
    useShallow((store) => ({
      editorOpen: store.editorOpen,
      editorMode: store.editorMode,
      draft: store.draft,
      draftImported: store.draftImported,
      showSourceControls: store.showSourceControls,
      uploadErrorActive: store.uploadErrorActive,
      uploadShakeActive: store.uploadShakeActive,
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
      importFromText: store.importFromText,
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
