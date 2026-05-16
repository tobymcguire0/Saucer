import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import { useSaucerStore } from "../saucer/useSaucerStore";
import { useStatusStore } from "../status/useStatusStore";
import { useBrowseStore } from "../browse/useBrowseStore";
import type { AppView } from "../browse/types";

export function getWorkspaceTitle(activeView: AppView) {
  switch (activeView) {
    case "browse": return "My Recipes";
    case "detail": return "Recipe";
    case "editor": return "Recipe Editor";
    case "search": return "Search";
    case "settings": return "Settings";
    default: return "";
  }
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
      browseState.setActiveWorkspace("detail");
      const recipe = recipes.find((entry) => entry.id === recipeId);
      updateStatus(recipe ? `Viewing ${recipe.title}.` : "Viewing recipe details.", "info");
    },
    [browseState, recipes, updateStatus],
  );

  const closeRecipeDetail = useCallback(() => {
    browseState.setActiveWorkspace("browse");
    updateStatus("Returned to browse.", "info");
  }, [browseState, updateStatus]);

  return {
    activeView: browseState.activeView,
    loading,
    setActiveWorkspace: browseState.setActiveWorkspace,
    openRecipeDetail,
    closeRecipeDetail,
  };
}
