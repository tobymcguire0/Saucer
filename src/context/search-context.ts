import type { RecipeQuery } from "../lib/models";
import { createRequiredContext } from "./createRequiredContext";

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

export const [SearchContext, useSearchContext] =
  createRequiredContext<SearchContextValue>("SearchContext");
