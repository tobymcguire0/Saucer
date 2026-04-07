export const sourceTypes = ["website", "photo", "text", "manual"] as const;
export type SourceType = (typeof sourceTypes)[number];

export const recipeSortOptions = ["updated", "title", "rating", "cuisine", "mealType"] as const;
export type RecipeSort = (typeof recipeSortOptions)[number];

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Tag {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  aliases: string[];
}

export interface Taxonomy {
  categories: Category[];
  tags: Tag[];
}

export interface Ingredient {
  id: string;
  name: string;
  raw: string;
}

export interface Recipe {
  id: string;
  title: string;
  summary: string;
  sourceType: SourceType;
  sourceRef?: string;
  heroImage?: string;
  ingredients: Ingredient[];
  instructions: string[];
  servings?: string;
  cuisine?: string;
  mealType?: string;
  rating: number;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TagSuggestion {
  input: string;
  normalized: string;
  categoryId: string;
  status: "exact" | "alias" | "fuzzy" | "new";
  confidence: number;
  tagId?: string;
  matchedName?: string;
}

export interface RecipeDraft {
  id?: string;
  title: string;
  summary: string;
  sourceType: SourceType;
  sourceRef: string;
  heroImage?: string;
  ingredientsText: string;
  instructionsText: string;
  servings: string;
  cuisine: string;
  mealType: string;
  selectedTagIds: string[];
}

export interface RecipeQuery {
  searchText: string;
  selectedTagIds: string[];
  excludedTagIds: string[];
  requiredIngredientTerms: string[];
  sortBy: RecipeSort;
}

export interface RandomRecipeRequest {
  requiredTagIds: string[];
  excludedTagIds: string[];
  requiredIngredientTerms: string[];
}

export interface AppSnapshot {
  recipes: Recipe[];
  taxonomy: Taxonomy;
}
