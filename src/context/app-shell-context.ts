import { createRequiredContext } from "./createRequiredContext";

export type AppView = "recipes" | "taxonomy" | "recipeDetail";

export type AppShellContextValue = {
  activeView: AppView;
  loading: boolean;
  setActiveWorkspace: (view: AppView) => void;
  openRecipeDetail: (recipeId: string) => void;
  closeRecipeDetail: () => void;
};

export const [AppShellContext, useAppShellContext] =
  createRequiredContext<AppShellContextValue>("AppShellContext");
