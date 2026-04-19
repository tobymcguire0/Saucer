import { ObsidianRecipeStore, type RecipeStore } from "../../lib/persistence";

let recipeStore: RecipeStore | undefined;

export function getRecipeStore() {
  recipeStore ??= new ObsidianRecipeStore();
  return recipeStore;
}
