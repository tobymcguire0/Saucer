export const sourceTypes = ["website", "photo", "text", "manual"] as const;
export type SourceType = (typeof sourceTypes)[number];

export interface Ingredient {
  id: string;
  name: string;
  raw: string;
}

export interface Recipe {
  id: string;
  title: string;
  summary?: string;
  sourceType?: SourceType;
  sourceRef?: string;
  heroImage?: string;
  ingredients: Ingredient[];
  instructions?: string[];
  servings?: string;
  cuisine?: string;
  mealType?: string;
  rating?: number;
  tagIds?: string[];
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export type RecipeInput = Omit<Recipe, "createdAt" | "updatedAt" | "revision">;

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

export interface TaxonomyDocument {
  taxonomy: Taxonomy;
  revision: number;
  updatedAt: string;
}

export interface SyncPayload {
  recipes: Recipe[];
  deletedIds: string[];
  cursor: string;
  taxonomy?: Taxonomy;
  taxonomyRevision?: number;
}

export interface UpsertRecipeMutation {
  type: "upsertRecipe";
  clientMutationId: string;
  recipe: RecipeInput;
}

export interface DeleteRecipeMutation {
  type: "deleteRecipe";
  clientMutationId: string;
  recipeId: string;
  revision: number;
}

export type Mutation = UpsertRecipeMutation | DeleteRecipeMutation;
