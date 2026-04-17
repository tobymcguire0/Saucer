import { useAppShellViewModel } from "../app/useAppShellViewModel";
import { useRecipeEditorActions } from "../editor/useRecipeEditorViewModel";
import { useTaxonomyViewModel } from "../taxonomy/useTaxonomyViewModel";
import { useRecipeCatalogViewModel } from "./useRecipeCatalogViewModel";

export function useRecipeDetailViewModel() {
  const { closeRecipeDetail } = useAppShellViewModel();
  const { selectedRecipe, deleteRecipe, updateRecipeRating } = useRecipeCatalogViewModel();
  const { openEditEditor } = useRecipeEditorActions();
  const { tagLookup, categoryLookup } = useTaxonomyViewModel();

  return {
    recipe: selectedRecipe,
    closeRecipeDetail,
    deleteRecipe,
    updateRecipeRating,
    openEditEditor,
    tagLookup,
    categoryLookup,
  };
}
