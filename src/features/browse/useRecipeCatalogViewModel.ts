import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSaucerStore } from "../saucer/useSaucerStore";
import type { Recipe } from "../../lib/models";
import { filterRecipes, groupRecipesByCategory } from "../../lib/selectors";
import { useBrowseStore } from "./useBrowseStore";

export type GroupedRecipeSection = {
  id: string;
  label: string;
  recipes: Recipe[];
};

export function useRecipeCatalogViewModel() {
  const saucerState = useSaucerStore(
    useShallow((state) => ({
      recipes: state.recipes,
      taxonomy: state.taxonomy,
      deleteRecipe: state.deleteRecipe,
      updateRecipeRating: state.updateRecipeRating,
    })),
  );
  const browseState = useBrowseStore(
    useShallow((state) => ({
      query: state.query,
      groupByCategoryId: state.groupByCategoryId,
      selectedRecipeId: state.selectedRecipeId,
      randomRecipeId: state.randomRecipeId,
    })),
  );

  return useMemo(() => {
    const visibleRecipes = filterRecipes(saucerState.recipes, browseState.query);

    return {
      recipes: saucerState.recipes,
      visibleRecipes,
      groupedRecipes: browseState.groupByCategoryId
        ? groupRecipesByCategory(visibleRecipes, saucerState.taxonomy, browseState.groupByCategoryId)
        : [],
      selectedRecipe: saucerState.recipes.find((recipe) => recipe.id === browseState.selectedRecipeId),
      selectedRandomRecipe: saucerState.recipes.find((recipe) => recipe.id === browseState.randomRecipeId),
      deleteRecipe: saucerState.deleteRecipe,
      updateRecipeRating: saucerState.updateRecipeRating,
    };
  }, [browseState, saucerState]);
}
