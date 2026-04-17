import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import { useBrowseStore } from "../features/browse/useBrowseStore";
import type { AppView } from "../features/browse/types";
import { useSaucerStore } from "../features/saucer/useSaucerStore";
import { useStatusStore } from "../features/status/useStatusStore";

export type { AppView };

export type AppShellContextValue = {
  activeView: AppView;
  loading: boolean;
  setActiveWorkspace: (view: AppView) => void;
  openRecipeDetail: (recipeId: string) => void;
  closeRecipeDetail: () => void;
};

export function useAppShellContext(): AppShellContextValue {
  const loading = useSaucerStore((state) => state.loading);
  const recipes = useSaucerStore((state) => state.recipes);
  const updateStatus = useStatusStore((state) => state.updateStatus);
  const { activeView, setActiveWorkspace, setSelectedRecipeId } = useBrowseStore(
    useShallow((state) => ({
      activeView: state.activeView,
      setActiveWorkspace: state.setActiveWorkspace,
      setSelectedRecipeId: state.setSelectedRecipeId,
    })),
  );

  const openRecipeDetail = useCallback(
    (recipeId: string) => {
      setSelectedRecipeId(recipeId);
      setActiveWorkspace("recipeDetail");
      const recipe = recipes.find((entry) => entry.id === recipeId);
      updateStatus(recipe ? `Viewing ${recipe.title}.` : "Viewing recipe details.", "info");
    },
    [recipes, setActiveWorkspace, setSelectedRecipeId, updateStatus],
  );

  const closeRecipeDetail = useCallback(() => {
    setActiveWorkspace("recipes");
    updateStatus("Returned to recipe browse view.", "info");
  }, [setActiveWorkspace, updateStatus]);

  return {
    activeView,
    loading,
    setActiveWorkspace,
    openRecipeDetail,
    closeRecipeDetail,
  };
}
