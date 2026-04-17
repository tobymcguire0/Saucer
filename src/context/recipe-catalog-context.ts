import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useBrowseStore } from "../features/browse/useBrowseStore";
import { useSaucerStore } from "../features/saucer/useSaucerStore";
import type { Recipe } from "../lib/models";
import { filterRecipes, groupRecipesByCategory } from "../lib/selectors";

export type GroupedRecipeSection = {
  id: string;
  label: string;
  recipes: Recipe[];
};

export type RecipeCatalogContextValue = {
  recipes: Recipe[];
  visibleRecipes: Recipe[];
  groupedRecipes: GroupedRecipeSection[];
  selectedRecipe?: Recipe;
  selectedRandomRecipe?: Recipe;
  deleteRecipe: (recipeId: string) => Promise<void>;
  updateRecipeRating: (recipeId: string, rating: number) => Promise<void>;
};

export function useRecipeCatalogContext(): RecipeCatalogContextValue {
  const { recipes, taxonomy, deleteRecipe, updateRecipeRating } = useSaucerStore(
    useShallow((state) => ({
      recipes: state.recipes,
      taxonomy: state.taxonomy,
      deleteRecipe: state.deleteRecipe,
      updateRecipeRating: state.updateRecipeRating,
    })),
  );
  const { query, groupByCategoryId, selectedRecipeId, randomRecipeId } = useBrowseStore(
    useShallow((state) => ({
      query: state.query,
      groupByCategoryId: state.groupByCategoryId,
      selectedRecipeId: state.selectedRecipeId,
      randomRecipeId: state.randomRecipeId,
    })),
  );

  return useMemo(() => {
    const visibleRecipes = filterRecipes(recipes, query);

    return {
      recipes,
      visibleRecipes,
      groupedRecipes: groupByCategoryId
        ? groupRecipesByCategory(visibleRecipes, taxonomy, groupByCategoryId)
        : [],
      selectedRecipe: recipes.find((recipe) => recipe.id === selectedRecipeId),
      selectedRandomRecipe: recipes.find((recipe) => recipe.id === randomRecipeId),
      deleteRecipe,
      updateRecipeRating,
    };
  }, [
    deleteRecipe,
    groupByCategoryId,
    query,
    randomRecipeId,
    recipes,
    selectedRecipeId,
    taxonomy,
    updateRecipeRating,
  ]);
}
