import type { Recipe } from "../lib/models";
import { createRequiredContext } from "./createRequiredContext";

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

export const [RecipeCatalogContext, useRecipeCatalogContext] =
  createRequiredContext<RecipeCatalogContextValue>("RecipeCatalogContext");
