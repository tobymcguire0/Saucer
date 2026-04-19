import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSaucerStore } from "../saucer/useSaucerStore";
import { useStatusStore } from "../status/useStatusStore";
import { useBrowseStore } from "../browse/useBrowseStore";
import type { AppView } from "../browse/types";

export function getWorkspaceTitle(activeView: AppView) {
  if (activeView === "recipes") {
    return "Browse recipes";
  }

  if (activeView === "recipeDetail") {
    return "Recipe details";
  }

  return "Manage categories and tags";
}

export function useAppShellViewModel() {
  const loading = useSaucerStore((state) => state.loading);
  const recipes = useSaucerStore((state) => state.recipes);
  const updateStatus = useStatusStore((state) => state.updateStatus);
  const browseState = useBrowseStore(
    useShallow((state) => ({
      activeView: state.activeView,
      setActiveWorkspace: state.setActiveWorkspace,
      setSelectedRecipeId: state.setSelectedRecipeId,
    })),
  );

  const openRecipeDetail = useCallback(
    (recipeId: string) => {
      browseState.setSelectedRecipeId(recipeId);
      browseState.setActiveWorkspace("recipeDetail");
      const recipe = recipes.find((entry) => entry.id === recipeId);
      updateStatus(recipe ? `Viewing ${recipe.title}.` : "Viewing recipe details.", "info");
    },
    [browseState, recipes, updateStatus],
  );

  const closeRecipeDetail = useCallback(() => {
    browseState.setActiveWorkspace("recipes");
    updateStatus("Returned to recipe browse view.", "info");
  }, [browseState, updateStatus]);

  return {
    activeView: browseState.activeView,
    loading,
    setActiveWorkspace: browseState.setActiveWorkspace,
    openRecipeDetail,
    closeRecipeDetail,
  };
}
