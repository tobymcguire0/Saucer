import { useAppShellViewModel } from "../app/useAppShellViewModel";
import { useRecipeEditorActions } from "../editor/useRecipeEditorViewModel";
import { useSaucerStore } from "../saucer/useSaucerStore";
import { useTaxonomyViewModel } from "../taxonomy/useTaxonomyViewModel";
import { useRecipeCatalogViewModel } from "./useRecipeCatalogViewModel";

export function useRecipeDetailViewModel() {
  const { closeRecipeDetail, openRecipeDetail } = useAppShellViewModel();
  const { selectedRecipe, deleteRecipe, updateRecipeRating } = useRecipeCatalogViewModel();
  const { openEditEditor } = useRecipeEditorActions();
  const { tagLookup, categoryLookup } = useTaxonomyViewModel();
  const recipes = useSaucerStore((state) => state.recipes);

  const linkedRecipes = (selectedRecipe?.linkedRecipeIds ?? [])
    .map((id) => recipes.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  return {
    recipe: selectedRecipe,
    closeRecipeDetail,
    deleteRecipe,
    updateRecipeRating,
    openEditEditor,
    tagLookup,
    categoryLookup,
    linkedRecipes,
    openRecipeDetail,
  };
}
