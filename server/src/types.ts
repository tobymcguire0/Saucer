// ── Recipes─────────────────────────────────────────────────────────────────

export interface Ingredient {
  name?: string;
  raw?: string;
}

export interface Recipe {
  id: string;
  title: string;
  summary?: string;
  sourceType?: string;
  cuisine?: string;
  mealType?: string;
  servings?: number;
  rating?: number;
  tagIds?: string[];
  ingredients: Ingredient[];
  thumbnailUrl?: string;
  heroImage?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt?: string;
  [key: string]: unknown;
}

export interface RecipeIndexEntry {
  id: string;
  title: string;
  summary?: string;
  sourceType?: string;
  cuisine?: string;
  mealType?: string;
  servings?: number;
  rating?: number;
  tagIds?: string[];
  ingredientNames: string[];
  thumbnailUrl?: string;
  heroImage?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

// ── Taxonomy ────────────────────────────────────────────────────────────────

export interface TaxonomyCategory {
  id: string;
  name: string;
  description: string;
}

export interface TaxonomyTag {
  id: string;
  categoryId: string;
  name: string;
  aliases: string[];
}

export interface Taxonomy {
  categories: TaxonomyCategory[];
  tags: TaxonomyTag[];
}

export interface TaxonomyDocument {
  taxonomy: Taxonomy;
  revision: number;
  updatedAt: string;
}

// ── Sync & Persistence ──────────────────────────────────────────────────────

export interface Change {
  seq: number;
  userId: string;
  entityType: string;
  entityId: string;
  changeType: string;
  revision: number;
  changedAt: string;
}

export interface AppState {
  recipesByUser: Record<string, Recipe[]>;
  taxonomiesByUser: Record<string, TaxonomyDocument>;
  changes: Change[];
  processedMutations: Record<string, string[]>;
}

export interface SyncPayload {
  recipes: RecipeIndexEntry[];
  deletedIds: string[];
  taxonomy?: Taxonomy;
  taxonomyRevision?: number;
  cursor: string;
}

// ── Mutations (client → server sync pushes) ─────────────────────────────────

export interface UpsertRecipeMutation {
  type: "upsertRecipe";
  clientMutationId: string;
  recipe: Partial<Recipe> & { id: string };
  baseRevision?: number;
}

export interface DeleteRecipeMutation {
  type: "deleteRecipe";
  clientMutationId: string;
  recipeId: string;
  baseRevision?: number;
}

export interface ReplaceTaxonomyMutation {
  type: "replaceTaxonomy";
  clientMutationId: string;
  taxonomy: Taxonomy;
  baseRevision?: number;
}

export type Mutation = UpsertRecipeMutation | DeleteRecipeMutation | ReplaceTaxonomyMutation;
