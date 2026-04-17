import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import { useBrowseStore } from "../features/browse/useBrowseStore";
import { useSaucerStore } from "../features/saucer/useSaucerStore";
import { useStatusStore } from "../features/status/useStatusStore";
import { pickRandomRecipe } from "../lib/selectors";
import type { RecipeQuery } from "../lib/models";

export type SearchContextValue = {
  query: RecipeQuery;
  groupByCategoryId: string;
  randomIngredientInput: string;
  updateSearchText: (searchText: string) => void;
  updateSortBy: (sortBy: RecipeQuery["sortBy"]) => void;
  updateGroupByCategory: (categoryId: string) => void;
  updateRandomIngredientSearch: (value: string) => void;
  toggleFilterTag: (tagId: string) => void;
  chooseRandomRecipe: () => void;
};

export function useSearchContext(): SearchContextValue {
  const recipes = useSaucerStore((state) => state.recipes);
  const updateStatus = useStatusStore((state) => state.updateStatus);
  const {
    query,
    groupByCategoryId,
    randomIngredientInput,
    updateSearchText,
    updateSortBy,
    updateGroupByCategory,
    updateRandomIngredientSearch,
    toggleFilterTag,
    setRandomRecipeId,
    setSelectedRecipeId,
    setActiveWorkspace,
  } = useBrowseStore(
    useShallow((state) => ({
      query: state.query,
      groupByCategoryId: state.groupByCategoryId,
      randomIngredientInput: state.randomIngredientInput,
      updateSearchText: state.updateSearchText,
      updateSortBy: state.updateSortBy,
      updateGroupByCategory: state.updateGroupByCategory,
      updateRandomIngredientSearch: state.updateRandomIngredientSearch,
      toggleFilterTag: state.toggleFilterTag,
      setRandomRecipeId: state.setRandomRecipeId,
      setSelectedRecipeId: state.setSelectedRecipeId,
      setActiveWorkspace: state.setActiveWorkspace,
    })),
  );

  const chooseRandomRecipe = useCallback(() => {
    const recipe = pickRandomRecipe(recipes, {
      requiredTagIds: query.selectedTagIds,
      excludedTagIds: [],
      requiredIngredientTerms: randomIngredientInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });

    setRandomRecipeId(recipe?.id ?? "");

    if (recipe) {
      setSelectedRecipeId(recipe.id);
      setActiveWorkspace("recipeDetail");
      updateStatus(`Viewing ${recipe.title}.`, "info");
      return;
    }

    updateStatus("No recipe matches the current random selection criteria.", "error");
  }, [
    query.selectedTagIds,
    randomIngredientInput,
    recipes,
    setActiveWorkspace,
    setRandomRecipeId,
    setSelectedRecipeId,
    updateStatus,
  ]);

  return {
    query,
    groupByCategoryId,
    randomIngredientInput,
    updateSearchText,
    updateSortBy,
    updateGroupByCategory,
    updateRandomIngredientSearch,
    toggleFilterTag,
    chooseRandomRecipe,
  };
}
