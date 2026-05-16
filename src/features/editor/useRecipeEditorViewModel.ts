import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import type { Recipe, SourceType } from "../../lib/models";
import { useSaucerStore } from "../saucer/useSaucerStore";
import { useBrowseStore } from "../browse/useBrowseStore";
import { useRecipeEditorStore } from "./useRecipeEditorStore";
import {
  buildTagSuggestions,
  filterDraftSuggestionsByConfidence,
  getVisibleDraftTagIds,
} from "../../lib/taxonomy";

export function useRecipeEditorActions() {
  const openCreate = useRecipeEditorStore((s) => s.openCreateEditor);
  const openEdit = useRecipeEditorStore((s) => s.openEditEditor);
  const setActiveWorkspace = useBrowseStore((s) => s.setActiveWorkspace);

  const openCreateEditor = useCallback(
    (sourceType: SourceType) => {
      openCreate(sourceType);
      setActiveWorkspace("editor");
    },
    [openCreate, setActiveWorkspace],
  );
  const openEditEditor = useCallback(
    (recipe: Recipe) => {
      openEdit(recipe);
      setActiveWorkspace("editor");
    },
    [openEdit, setActiveWorkspace],
  );
  return { openCreateEditor, openEditEditor };
}

export function useRecipeEditorViewModel() {
  const taxonomy = useSaucerStore((state) => state.taxonomy);
  const setActiveWorkspace = useBrowseStore((s) => s.setActiveWorkspace);
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
      setDraftLinkedRecipes: store.setDraftLinkedRecipes,
      goToParsedDraft: store.goToParsedDraft,
      parsedDrafts: store.parsedDrafts,
      parsedDraftIndex: store.parsedDraftIndex,
      saveDraft: store.saveDraft,
    })),
  );

  const exitEditor = useCallback(() => {
    state.closeEditor();
    setActiveWorkspace("browse");
  }, [state, setActiveWorkspace]);

  const saveAndExit = useCallback(async () => {
    await state.saveDraft();
    setActiveWorkspace("browse");
  }, [state, setActiveWorkspace]);

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
      exitEditor,
      saveAndExit,
      visibleDraftSuggestions,
      visibleEditableTagIds,
      showSourceSelector,
      showImportControls,
      showDraftForm,
    };
  }, [state, taxonomy, exitEditor, saveAndExit]);
}
