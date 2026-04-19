import { useAppShellViewModel } from "../app/useAppShellViewModel";
import { useRecipeEditorActions } from "../editor/useRecipeEditorViewModel";
import { useTaxonomyViewModel } from "../taxonomy/useTaxonomyViewModel";
import { useRecipeCatalogViewModel } from "./useRecipeCatalogViewModel";
import { useSearchViewModel } from "./useSearchViewModel";

export function useBrowseWorkspaceViewModel() {
  const { openRecipeDetail } = useAppShellViewModel();
  const { visibleRecipes, groupedRecipes, deleteRecipe, updateRecipeRating } = useRecipeCatalogViewModel();
  const { openEditEditor } = useRecipeEditorActions();
  const { groupByCategoryId } = useSearchViewModel();
  const { tagLookup, categoryLookup } = useTaxonomyViewModel();

  return {
    groupByCategoryId,
    visibleRecipes,
    groupedRecipes,
    deleteRecipe,
    updateRecipeRating,
    openEditEditor,
    openRecipeDetail,
    tagLookup,
    categoryLookup,
  };
}
