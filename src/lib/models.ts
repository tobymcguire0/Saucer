export const sourceTypes = ["website", "file", "text", "manual"] as const;
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

export interface IngredientUsage {
  ingredientId: string;
  qty?: string;
}

export interface RecipeStep {
  id: string;
  text: string;
  ingredientUsages: IngredientUsage[];
}

export interface Recipe {
  id: string;
  title: string;
  summary: string;
  sourceType: SourceType;
  sourceRef?: string;
  heroImage?: string;
  ingredients: Ingredient[];
  instructions: RecipeStep[];
  servings?: string;
  cuisine?: string;
  mealType?: string;
  prepTime?: string;
  cookTime?: string;
  notes?: string;
  rating: number;
  tagIds: string[];
  linkedRecipeIds: string[];
  createdAt: string;
  updatedAt: string;
  revision?: number;
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
  prepTime?: string;
  cookTime?: string;
  notes?: string;
  selectedTagIds: string[];
  selectedLinkedRecipeIds: string[];
  stepIngredientMap?: Record<number, number[]>;
}

export interface RecipeQuery {
  searchText: string;
  selectedTagIds: string[];
  excludedTagIds: string[];
  requiredIngredientTerms: string[];
  sortBy: RecipeSort;
  minRating?: number;
  maxTotalMinutes?: number;
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
