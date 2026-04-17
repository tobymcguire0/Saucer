import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { createDefaultTaxonomy } from "./defaultTaxonomy.js";
import type {
  AppState,
  Change,
  Mutation,
  Recipe,
  RecipeIndexEntry,
  SyncPayload,
  Taxonomy,
  TaxonomyDocument,
} from "./types.js";

export class ConflictError extends Error {}
export class NotFoundError extends Error {}

function createDefaultState(): AppState {
  return {
    recipesByUser: {},
    taxonomiesByUser: {},
    changes: [],
    processedMutations: {},
  };
}

function toIngredientNames(recipe: Recipe): string[] {
  return [
    ...new Set(
      recipe.ingredients
        .map((ingredient) => ingredient.name || ingredient.raw)
        .filter(Boolean) as string[],
    ),
  ];
}

function toIndexEntry(recipe: Recipe): RecipeIndexEntry {
  return {
    id: recipe.id,
    title: recipe.title,
    summary: recipe.summary,
    sourceType: recipe.sourceType,
    cuisine: recipe.cuisine,
    mealType: recipe.mealType,
    servings: recipe.servings,
    rating: recipe.rating,
    tagIds: recipe.tagIds,
    ingredientNames: toIngredientNames(recipe),
    thumbnailUrl: recipe.thumbnailUrl ?? recipe.heroImage,
    heroImage: recipe.heroImage,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    revision: recipe.revision,
  };
}

export class FileAppStore {
  private state: AppState = createDefaultState();
  private loaded = false;

  constructor(private filePath: string) {}

  private async loadState(): Promise<AppState> {
    if (this.loaded) {
      return this.state;
    }
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.state = JSON.parse(raw) as AppState;
    } catch {
      this.state = createDefaultState();
      await this.persist();
    }
    this.loaded = true;
    return this.state;
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.state, null, 2));
  }

  private async mutate<T>(callback: (state: AppState) => T | Promise<T>): Promise<T> {
    const state = await this.loadState();
    const result = await callback(state);
    await this.persist();
    return result;
  }

  private getUserRecipes(state: AppState, userId: string): Recipe[] {
    state.recipesByUser[userId] ??= [];
    return state.recipesByUser[userId];
  }

  private recordChange(
    state: AppState,
    userId: string,
    entityType: string,
    entityId: string,
    changeType: string,
    revision: number,
  ): void {
    state.changes.push({
      seq:
        state.changes.length === 0
          ? 1
          : state.changes[state.changes.length - 1].seq + 1,
      userId,
      entityType,
      entityId,
      changeType,
      revision,
      changedAt: new Date().toISOString(),
    });
  }

  // ── Taxonomy──────────────────────────────────────────────────────────

  async getTaxonomy(userId: string): Promise<TaxonomyDocument> {
    const state = await this.loadState();
    return (
      state.taxonomiesByUser[userId] ?? {
        taxonomy: createDefaultTaxonomy(),
        revision: 0,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async saveTaxonomy(
    userId: string,
    taxonomy: Taxonomy,
    baseRevision?: number,
  ): Promise<TaxonomyDocument> {
    return this.mutate((state) => {
      const current: TaxonomyDocument = state.taxonomiesByUser[userId] ?? {
        taxonomy: createDefaultTaxonomy(),
        revision: 0,
        updatedAt: new Date().toISOString(),
      };
      if (baseRevision !== undefined && current.revision !== baseRevision) {
        throw new ConflictError("The taxonomy changed on another device.");
      }
      const nextDocument: TaxonomyDocument = {
        taxonomy,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      state.taxonomiesByUser[userId] = nextDocument;
      this.recordChange(state, userId, "taxonomy", userId, "replace", nextDocument.revision);
      return nextDocument;
    });
  }

  // ── Recipes ───────────────────────────────────────────────────────────

  async listRecipeIndexEntries(userId: string): Promise<RecipeIndexEntry[]> {
    const state = await this.loadState();
    return this.getUserRecipes(state, userId)
      .filter((recipe) => !recipe.deletedAt)
      .map(toIndexEntry)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getRecipe(userId: string, recipeId: string): Promise<Recipe | undefined> {
    const state = await this.loadState();
    const recipe = this.getUserRecipes(state, userId).find(
      (entry) => entry.id === recipeId && !entry.deletedAt,
    );
    return recipe ? { ...recipe } : undefined;
  }

  async saveRecipe(
    userId: string,
    recipe: Partial<Recipe> & { id: string },
    baseRevision?: number,
  ): Promise<Recipe> {
    return this.mutate((state) => {
      const recipes = this.getUserRecipes(state, userId);
      const existing = recipes.find((entry) => entry.id === recipe.id);
      if (existing && baseRevision !== undefined && existing.revision !== baseRevision) {
        throw new ConflictError("This recipe changed on another device.");
      }
      const nextRecipe: Recipe = {
        ...existing,
        ...recipe,
        id: recipe.id || randomUUID(),
        ingredients: recipe.ingredients ?? existing?.ingredients ?? [],
        title: recipe.title ?? existing?.title ?? "",
        createdAt: existing?.createdAt ?? recipe.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revision: existing ? existing.revision + 1 : 1,
        deletedAt: undefined,
      };
      state.recipesByUser[userId] = recipes
        .filter((entry) => entry.id !== nextRecipe.id)
        .concat(nextRecipe);
      this.recordChange(state, userId, "recipe", nextRecipe.id, "upsert", nextRecipe.revision);
      return { ...nextRecipe };
    });
  }

  async deleteRecipe(
    userId: string,
    recipeId: string,
    baseRevision?: number,
  ): Promise<void> {
    return this.mutate((state) => {
      const recipes = this.getUserRecipes(state, userId);
      const existing = recipes.find((entry) => entry.id === recipeId);
      if (!existing) {
        throw new NotFoundError("Recipe not found.");
      }
      if (baseRevision !== undefined && existing.revision !== baseRevision) {
        throw new ConflictError("This recipe changed on another device.");
      }
      const deletedRecipe: Recipe = {
        ...existing,
        revision: existing.revision + 1,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.recipesByUser[userId] = recipes
        .filter((entry) => entry.id !== recipeId)
        .concat(deletedRecipe);
      this.recordChange(state, userId, "recipe", recipeId, "delete", deletedRecipe.revision);
    });
  }

  // ── Sync ──────────────────────────────────────────────────────────────

  async getSyncPayload(userId: string, cursor?: string): Promise<SyncPayload> {
    const state = await this.loadState();
    const numericCursor = cursor ? Number(cursor) : 0;
    const relevantChanges = state.changes.filter(
      (change) => change.userId === userId && change.seq > numericCursor,
    );
    const recipes = this.getUserRecipes(state, userId);

    const latestSeq =
      relevantChanges.length > 0
        ? relevantChanges[relevantChanges.length - 1].seq
        : state.changes.filter((change) => change.userId === userId).at(-1)?.seq ??
          numericCursor;

    if (!cursor) {
      const taxonomyDocument = state.taxonomiesByUser[userId];
      return {
        recipes: recipes.filter((recipe) => !recipe.deletedAt).map(toIndexEntry),
        deletedIds: [],
        taxonomy: taxonomyDocument?.taxonomy,
        taxonomyRevision: taxonomyDocument?.revision ?? 0,
        cursor: String(latestSeq),
      };
    }

    const changedRecipeIds = [
      ...new Set(
        relevantChanges
          .filter((change) => change.entityType === "recipe")
          .map((change) => change.entityId),
      ),
    ];
    const changedRecipes = recipes
      .filter((recipe) => changedRecipeIds.includes(recipe.id) && !recipe.deletedAt)
      .map(toIndexEntry);
    const deletedIds = changedRecipeIds.filter((recipeId) =>
      recipes.some((recipe) => recipe.id === recipeId && Boolean(recipe.deletedAt)),
    );

    const taxonomyChange = relevantChanges
      .filter((change) => change.entityType === "taxonomy")
      .at(-1);
    const taxonomyDocument = taxonomyChange ? state.taxonomiesByUser[userId] : undefined;

    return {
      recipes: changedRecipes,
      deletedIds,
      taxonomy: taxonomyDocument?.taxonomy,
      taxonomyRevision: taxonomyDocument?.revision,
      cursor: String(latestSeq),
    };
  }

  // ── Mutation deduplication ────────────────────────────────────────────

  async hasProcessedMutation(userId: string, clientMutationId: string): Promise<boolean> {
    const state = await this.loadState();
    return state.processedMutations[userId]?.includes(clientMutationId) ?? false;
  }

  async markMutationProcessed(userId: string, clientMutationId: string): Promise<void> {
    return this.mutate((state) => {
      state.processedMutations[userId] ??= [];
      if (!state.processedMutations[userId].includes(clientMutationId)) {
        state.processedMutations[userId].push(clientMutationId);
      }
    });
  }

  async applyMutations(userId: string, mutations: Mutation[]): Promise<SyncPayload> {
    for (const mutation of mutations) {
      if (await this.hasProcessedMutation(userId, mutation.clientMutationId)) {
        continue;
      }
      if (mutation.type === "upsertRecipe") {
        await this.saveRecipe(userId, mutation.recipe, mutation.baseRevision);
      } else if (mutation.type === "deleteRecipe") {
        await this.deleteRecipe(userId, mutation.recipeId, mutation.baseRevision);
      } else {
        await this.saveTaxonomy(userId, mutation.taxonomy, mutation.baseRevision);
      }
      await this.markMutationProcessed(userId, mutation.clientMutationId);
    }
    return this.getSyncPayload(userId);
  }
}
