export type SourceType = "website" | "photo" | "text" | "manual";

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
  heroImagePath?: string;
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
  suggestedTags: TagSuggestion[];
}

export interface RecipeQuery {
  searchText: string;
  selectedTagIds: string[];
  excludedTagIds: string[];
  requiredIngredientTerms: string[];
  sortBy: "updated" | "title" | "rating" | "cuisine" | "mealType";
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
