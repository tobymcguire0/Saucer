import { useShallow } from "zustand/react/shallow";

import { useTaxonomyUiStore } from "./useTaxonomyUiStore";

export function useTaxonomyFilterUiViewModel() {
  return useTaxonomyUiStore(
    useShallow((state) => ({
      sidebarCategoryInputs: state.sidebarCategoryInputs,
      editorCategoryInputs: state.editorCategoryInputs,
      setCategoryInput: state.setCategoryInput,
      resetCategoryInputs: state.resetCategoryInputs,
    })),
  );
}

export function useTaxonomyBrowserUiViewModel() {
  return useTaxonomyUiStore(
    useShallow((state) => ({
      collapsedCategoryIds: state.collapsedCategoryIds,
      toggleCategoryCollapsed: state.toggleCategoryCollapsed,
    })),
  );
}

export function useTaxonomyAdminViewModel() {
  return useTaxonomyUiStore(
    useShallow((state) => ({
      categoryForm: state.categoryForm,
      tagForm: state.tagForm,
      aliasForm: state.aliasForm,
      mergeForm: state.mergeForm,
      updateCategoryForm: state.updateCategoryForm,
      updateTagForm: state.updateTagForm,
      updateAliasForm: state.updateAliasForm,
      updateMergeForm: state.updateMergeForm,
      saveCategory: state.saveCategory,
      saveTag: state.saveTag,
      saveAlias: state.saveAlias,
      mergeSelectedTags: state.mergeSelectedTags,
    })),
  );
}
