import { recipeSortOptions, sourceTypes, type RecipeSort, type SourceType } from "./models";

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isSourceType(value: string): value is SourceType {
  return sourceTypes.some((sourceType) => sourceType === value);
}

export function isRecipeSort(value: string): value is RecipeSort {
  return recipeSortOptions.some((sortOption) => sortOption === value);
}
