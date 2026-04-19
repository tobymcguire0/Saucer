import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSaucerStore } from "../saucer/useSaucerStore";
import { useStatusStore } from "../status/useStatusStore";
import { pickRandomRecipe } from "../../lib/selectors";
import { useBrowseStore } from "./useBrowseStore";

export function useSearchViewModel() {
  const recipes = useSaucerStore((state) => state.recipes);
  const updateStatus = useStatusStore((state) => state.updateStatus);
  const state = useBrowseStore(
    useShallow((store) => ({
      query: store.query,
      groupByCategoryId: store.groupByCategoryId,
      randomIngredientInput: store.randomIngredientInput,
      updateSearchText: store.updateSearchText,
      updateSortBy: store.updateSortBy,
      updateGroupByCategory: store.updateGroupByCategory,
      updateRandomIngredientSearch: store.updateRandomIngredientSearch,
      toggleFilterTag: store.toggleFilterTag,
      setRandomRecipeId: store.setRandomRecipeId,
      setSelectedRecipeId: store.setSelectedRecipeId,
      setActiveWorkspace: store.setActiveWorkspace,
    })),
  );

  const chooseRandomRecipe = useCallback(() => {
    const recipe = pickRandomRecipe(recipes, {
      requiredTagIds: state.query.selectedTagIds,
      excludedTagIds: [],
      requiredIngredientTerms: state.randomIngredientInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });

    state.setRandomRecipeId(recipe?.id ?? "");

    if (recipe) {
      state.setSelectedRecipeId(recipe.id);
      state.setActiveWorkspace("recipeDetail");
      updateStatus(`Viewing ${recipe.title}.`, "info");
      return;
    }

    updateStatus("No recipe matches the current random selection criteria.", "error");
  }, [
    recipes,
    state,
    updateStatus,
  ]);

  return {
    query: state.query,
    groupByCategoryId: state.groupByCategoryId,
    randomIngredientInput: state.randomIngredientInput,
    updateSearchText: state.updateSearchText,
    updateSortBy: state.updateSortBy,
    updateGroupByCategory: state.updateGroupByCategory,
    updateRandomIngredientSearch: state.updateRandomIngredientSearch,
    toggleFilterTag: state.toggleFilterTag,
    chooseRandomRecipe,
  };
}
