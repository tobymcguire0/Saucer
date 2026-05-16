import { create } from "zustand";

import type { RecipeQuery } from "../../lib/models";
import type { AppView } from "./types";

const defaultQuery: RecipeQuery = {
  searchText: "",
  selectedTagIds: [],
  excludedTagIds: [],
  requiredIngredientTerms: [],
  sortBy: "updated",
};

function createInitialState() {
  return {
    query: { ...defaultQuery },
    groupByCategoryId: "",
    randomIngredientInput: "",
    activeView: "browse" as AppView,
    selectedRecipeId: "",
    randomRecipeId: "",
  };
}

type BrowseStoreState = ReturnType<typeof createInitialState> & {
  updateSearchText: (searchText: string) => void;
  updateSortBy: (sortBy: RecipeQuery["sortBy"]) => void;
  updateGroupByCategory: (categoryId: string) => void;
  updateRandomIngredientSearch: (value: string) => void;
  toggleFilterTag: (tagId: string) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setMinRating: (minRating: number | undefined) => void;
  setMaxTotalMinutes: (maxTotalMinutes: number | undefined) => void;
  clearAllFilters: () => void;
  setActiveWorkspace: (view: AppView) => void;
  setSelectedRecipeId: (recipeId: string) => void;
  setRandomRecipeId: (recipeId: string) => void;
  reset: () => void;
};

export const useBrowseStore = create<BrowseStoreState>((set) => ({
  ...createInitialState(),
  updateSearchText: (searchText) =>
    set((state) => ({ query: { ...state.query, searchText } })),
  updateSortBy: (sortBy) =>
    set((state) => ({ query: { ...state.query, sortBy } })),
  updateGroupByCategory: (groupByCategoryId) => set({ groupByCategoryId }),
  updateRandomIngredientSearch: (randomIngredientInput) => set({ randomIngredientInput }),
  toggleFilterTag: (tagId) =>
    set((state) => ({
      query: {
        ...state.query,
        selectedTagIds: state.query.selectedTagIds.includes(tagId)
          ? state.query.selectedTagIds.filter((id) => id !== tagId)
          : [...state.query.selectedTagIds, tagId],
      },
    })),
  setSelectedTagIds: (selectedTagIds) =>
    set((state) => ({ query: { ...state.query, selectedTagIds } })),
  setMinRating: (minRating) =>
    set((state) => ({ query: { ...state.query, minRating } })),
  setMaxTotalMinutes: (maxTotalMinutes) =>
    set((state) => ({ query: { ...state.query, maxTotalMinutes } })),
  clearAllFilters: () =>
    set((state) => ({
      query: {
        ...state.query,
        selectedTagIds: [],
        excludedTagIds: [],
        requiredIngredientTerms: [],
        minRating: undefined,
        maxTotalMinutes: undefined,
      },
    })),
  setActiveWorkspace: (activeView) => set({ activeView }),
  setSelectedRecipeId: (selectedRecipeId) => set({ selectedRecipeId }),
  setRandomRecipeId: (randomRecipeId) => set({ randomRecipeId }),
  reset: () => set(createInitialState()),
}));

export function resetBrowseStore() {
  useBrowseStore.getState().reset();
}
