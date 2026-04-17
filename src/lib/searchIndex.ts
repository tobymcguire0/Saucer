import type { Recipe, RecipeQuery, Taxonomy } from "./models";
import { filterRecipes } from "./selectors";

export class SqliteSearchIndex {
  private recipes: Recipe[] = [];

  async rebuild(recipes: Recipe[], _taxonomy: Taxonomy) {
    this.recipes = recipes;
  }

  async queryRecipeIds(query: RecipeQuery) {
    return filterRecipes(this.recipes, query).map((recipe) => recipe.id);
  }
}
