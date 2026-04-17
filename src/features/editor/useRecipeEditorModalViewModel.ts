import { useCallback } from "react";

import { useTaxonomyViewModel } from "../taxonomy/useTaxonomyViewModel";
import { useTaxonomyFilterUiViewModel } from "../taxonomy/useTaxonomyUiViewModels";
import { useRecipeEditorViewModel } from "./useRecipeEditorViewModel";

export function useRecipeEditorModalViewModel() {
  const editor = useRecipeEditorViewModel();
  const { editorCategoryInputs, setCategoryInput } = useTaxonomyFilterUiViewModel();
  const { taxonomy, taxonomyGroups, categoryLookup, mealTimeCategory } = useTaxonomyViewModel();
  const setEditorCategoryInput = useCallback(
    (categoryId: string, value: string) => setCategoryInput("editor", categoryId, value),
    [setCategoryInput],
  );

  return {
    ...editor,
    editorCategoryInputs,
    setEditorCategoryInput,
    taxonomy,
    taxonomyGroups,
    categoryLookup,
    mealTimeCategory,
  };
}
