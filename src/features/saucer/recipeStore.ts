import { IndexedDbRecipeStore } from "../../lib/persistence/indexedDbStore";
import { ObsidianRecipeStore } from "../../lib/persistence/obsidianStore";
import { canUseTauri, type RecipeStore } from "../../lib/persistence";

let recipeStore: RecipeStore | undefined;

export function getRecipeStore(): RecipeStore {
  if (!recipeStore) {
    if (canUseTauri()) {
      recipeStore = new ObsidianRecipeStore();
    } else if (typeof indexedDB !== "undefined") {
      recipeStore = new IndexedDbRecipeStore();
    } else {
      recipeStore = new ObsidianRecipeStore();
    }
  }
  return recipeStore;
}

export function resetRecipeStore() {
  recipeStore = undefined;
}
