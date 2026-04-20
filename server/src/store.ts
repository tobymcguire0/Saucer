import { readFile, writeFile } from "node:fs/promises";
import type { Pool, PoolClient } from "pg";
import type {
  Ingredient,
  Mutation,
  Recipe,
  RecipeInput,
  SourceType,
  SyncPayload,
  Taxonomy,
  TaxonomyDocument,
} from "./types.js";

export interface AppStore {
  getTaxonomy(userId: string): Promise<TaxonomyDocument>;
  getSyncPayload(userId: string, clientId: string, cursor?: string): Promise<SyncPayload>;
  applyMutations(userId: string, clientId: string, mutations: Mutation[]): Promise<SyncPayload>;
  getRecipe(userId: string, recipeId: string): Promise<Recipe | null>;
  saveTaxonomy(userId: string, taxonomy: Taxonomy): Promise<TaxonomyDocument>;
}

// ── FileAppStore ──────────────────────────────────────────────────────────────

interface StoredRecipe {
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
  deletedAt?: string;
}

interface UserData {
  revision: number;
  recipes: Record<string, StoredRecipe | undefined>;
  appliedMutations: string[];
  taxonomy: TaxonomyDocument | null;
  clientCursors: Record<string, number>;
}

interface StoreData {
  users: Record<string, UserData | undefined>;
}

function toRecipe(stored: StoredRecipe): Recipe {
  const { deletedAt: _, ...recipe } = stored;
  return recipe as Recipe;
}

const emptyTaxonomy = (): TaxonomyDocument => ({
  taxonomy: { categories: [], tags: [] },
  revision: 0,
  updatedAt: new Date().toISOString(),
});

function buildFilePayload(user: UserData, cursorRev: number): SyncPayload {
  const recipes: Recipe[] = [];
  const deletedIds: string[] = [];
  for (const stored of Object.values(user.recipes)) {
    if (!stored || stored.revision <= cursorRev) continue;
    if (stored.deletedAt !== undefined) {
      deletedIds.push(stored.id);
    } else {
      recipes.push(toRecipe(stored));
    }
  }
  return { recipes, deletedIds, cursor: String(user.revision) };
}

export class FileAppStore implements AppStore {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async read(): Promise<StoreData> {
    try {
      const text = await readFile(this.filePath, "utf8");
      return JSON.parse(text) as StoreData;
    } catch {
      return { users: {} };
    }
  }

  private async write(data: StoreData): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  private ensureUser(data: StoreData, userId: string): UserData {
    if (!data.users[userId]) {
      data.users[userId] = {
        revision: 0,
        recipes: {},
        appliedMutations: [],
        taxonomy: null,
        clientCursors: {},
      };
    }
    const user = data.users[userId] as UserData;
    user.clientCursors ??= {};
    return user;
  }

  async getSyncPayload(userId: string, clientId: string, cursor?: string): Promise<SyncPayload> {
    const data = await this.read();
    const user = this.ensureUser(data, userId);
    const cursorRev = cursor !== undefined ? parseInt(cursor, 10) : 0;

    user.clientCursors[clientId] = cursorRev;
    await this.write(data);

    return buildFilePayload(user, cursorRev);
  }

  async saveRecipe(userId: string, input: RecipeInput): Promise<void> {
    const data = await this.read();
    const user = this.ensureUser(data, userId);
    const now = new Date().toISOString();
    const existing = user.recipes[input.id];

    user.revision += 1;
    user.recipes[input.id] = {
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      revision: user.revision,
    };

    await this.write(data);
  }

  async deleteRecipe(userId: string, recipeId: string, _revision: number): Promise<void> {
    const data = await this.read();
    const user = this.ensureUser(data, userId);
    const existing = user.recipes[recipeId];
    if (!existing || existing.deletedAt !== undefined) return;

    user.revision += 1;
    user.recipes[recipeId] = {
      ...existing,
      revision: user.revision,
      deletedAt: new Date().toISOString(),
    };

    await this.write(data);
  }

  async applyMutations(userId: string, clientId: string, mutations: Mutation[]): Promise<SyncPayload> {
    const data = await this.read();
    const user = this.ensureUser(data, userId);
    const applied = new Set(user.appliedMutations);

    for (const mutation of mutations) {
      if (applied.has(mutation.clientMutationId)) continue;
      applied.add(mutation.clientMutationId);
      user.appliedMutations.push(mutation.clientMutationId);

      user.revision += 1;
      const now = new Date().toISOString();

      if (mutation.type === "upsertRecipe") {
        const existing = user.recipes[mutation.recipe.id];
        user.recipes[mutation.recipe.id] = {
          ...mutation.recipe,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          revision: user.revision,
        };
      } else if (mutation.type === "deleteRecipe") {
        const existing = user.recipes[mutation.recipeId];
        if (existing && existing.deletedAt === undefined) {
          user.recipes[mutation.recipeId] = {
            ...existing,
            revision: user.revision,
            deletedAt: now,
          };
        }
      }
    }

    user.clientCursors[clientId] = user.revision;
    await this.write(data);
    return buildFilePayload(user, 0);
  }

  async getRecipe(userId: string, recipeId: string): Promise<Recipe | null> {
    const data = await this.read();
    const user = data.users[userId];
    if (!user) return null;
    const stored = user.recipes[recipeId];
    if (!stored || stored.deletedAt !== undefined) return null;
    return toRecipe(stored);
  }

  async getTaxonomy(userId: string): Promise<TaxonomyDocument> {
    const data = await this.read();
    return data.users[userId]?.taxonomy ?? emptyTaxonomy();
  }

  async saveTaxonomy(userId: string, taxonomy: Taxonomy): Promise<TaxonomyDocument> {
    const data = await this.read();
    const user = this.ensureUser(data, userId);
    const doc: TaxonomyDocument = {
      taxonomy,
      revision: (user.taxonomy?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    user.taxonomy = doc;
    await this.write(data);
    return doc;
  }
}

// ── PostgresAppStore ──────────────────────────────────────────────────────────

export class PostgresAppStore implements AppStore {
  constructor(private pool: Pool) {}

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS user_revisions (
        user_id TEXT PRIMARY KEY,
        current_revision BIGINT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        data JSONB NOT NULL,
        revision BIGINT NOT NULL,
        deleted_at TIMESTAMPTZ,
        PRIMARY KEY (id, user_id)
      );

      CREATE TABLE IF NOT EXISTS applied_mutations (
        client_mutation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        PRIMARY KEY (client_mutation_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS taxonomy_documents (
        user_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        revision BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS client_cursors (
        client_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        cursor BIGINT NOT NULL DEFAULT 0,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (client_id, user_id)
      );
    `);
  }

  private async buildSyncPayload(userId: string, cursorRev: number): Promise<SyncPayload> {
    const [recipesResult, deletedResult, revResult] = await Promise.all([
      this.pool.query<{ data: Recipe }>(
        "SELECT data FROM recipes WHERE user_id = $1 AND revision > $2 AND deleted_at IS NULL",
        [userId, cursorRev],
      ),
      this.pool.query<{ id: string }>(
        "SELECT id FROM recipes WHERE user_id = $1 AND revision > $2 AND deleted_at IS NOT NULL",
        [userId, cursorRev],
      ),
      this.pool.query<{ rev: string }>(
        "SELECT COALESCE(current_revision, 0)::text AS rev FROM user_revisions WHERE user_id = $1",
        [userId],
      ),
    ]);

    return {
      recipes: recipesResult.rows.map((r) => r.data),
      deletedIds: deletedResult.rows.map((r) => r.id),
      cursor: revResult.rows[0]?.rev ?? "0",
    };
  }

  async getSyncPayload(userId: string, clientId: string, cursor?: string): Promise<SyncPayload> {
    const cursorRev = cursor !== undefined ? parseInt(cursor, 10) : 0;

    const [payload] = await Promise.all([
      this.buildSyncPayload(userId, cursorRev),
      this.pool.query(
        `INSERT INTO client_cursors (client_id, user_id, cursor, last_seen_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (client_id, user_id) DO UPDATE SET cursor = $3, last_seen_at = NOW()`,
        [clientId, userId, cursorRev],
      ),
    ]);

    return payload;
  }

  async applyMutations(userId: string, clientId: string, mutations: Mutation[]): Promise<SyncPayload> {
    const client: PoolClient = await this.pool.connect();
    let finalRevision = 0;
    try {
      await client.query("BEGIN");

      for (const mutation of mutations) {
        const existing = await client.query<{ client_mutation_id: string }>(
          "SELECT client_mutation_id FROM applied_mutations WHERE client_mutation_id = $1 AND user_id = $2",
          [mutation.clientMutationId, userId],
        );
        if ((existing.rowCount ?? 0) > 0) continue;

        const revResult = await client.query<{ current_revision: string }>(
          `INSERT INTO user_revisions (user_id, current_revision) VALUES ($1, 1)
           ON CONFLICT (user_id) DO UPDATE SET current_revision = user_revisions.current_revision + 1
           RETURNING current_revision`,
          [userId],
        );
        const revision = parseInt(revResult.rows[0].current_revision, 10);
        finalRevision = revision;
        const now = new Date().toISOString();

        if (mutation.type === "upsertRecipe") {
          const prevResult = await client.query<{ created_at: string }>(
            "SELECT data->>'createdAt' AS created_at FROM recipes WHERE id = $1 AND user_id = $2",
            [mutation.recipe.id, userId],
          );
          const createdAt = prevResult.rows[0]?.created_at ?? now;
          const data: Recipe = {
            ...mutation.recipe,
            createdAt,
            updatedAt: now,
            revision,
          };
          await client.query(
            `INSERT INTO recipes (id, user_id, data, revision, deleted_at)
             VALUES ($1, $2, $3, $4, NULL)
             ON CONFLICT (id, user_id) DO UPDATE SET data = $3, revision = $4, deleted_at = NULL`,
            [mutation.recipe.id, userId, JSON.stringify(data), revision],
          );
        } else if (mutation.type === "deleteRecipe") {
          await client.query(
            "UPDATE recipes SET deleted_at = $1, revision = $2 WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL",
            [now, revision, mutation.recipeId, userId],
          );
        }

        await client.query(
          "INSERT INTO applied_mutations (client_mutation_id, user_id) VALUES ($1, $2)",
          [mutation.clientMutationId, userId],
        );
      }

      if (finalRevision === 0) {
        const revResult = await client.query<{ current_revision: string }>(
          "SELECT COALESCE(current_revision, 0)::text AS current_revision FROM user_revisions WHERE user_id = $1",
          [userId],
        );
        finalRevision = parseInt(revResult.rows[0]?.current_revision ?? "0", 10);
      }

      await client.query(
        `INSERT INTO client_cursors (client_id, user_id, cursor, last_seen_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (client_id, user_id) DO UPDATE SET cursor = $3, last_seen_at = NOW()`,
        [clientId, userId, finalRevision],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return this.buildSyncPayload(userId, 0);
  }

  async getRecipe(userId: string, recipeId: string): Promise<Recipe | null> {
    const result = await this.pool.query<{ data: Recipe }>(
      "SELECT data FROM recipes WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [recipeId, userId],
    );
    return (result.rowCount ?? 0) > 0 ? result.rows[0].data : null;
  }

  async getTaxonomy(userId: string): Promise<TaxonomyDocument> {
    const result = await this.pool.query<{ data: Taxonomy; revision: number; updated_at: string }>(
      "SELECT data, revision, updated_at FROM taxonomy_documents WHERE user_id = $1",
      [userId],
    );
    if ((result.rowCount ?? 0) === 0) {
      return emptyTaxonomy();
    }
    const row = result.rows[0];
    return { taxonomy: row.data, revision: row.revision, updatedAt: row.updated_at };
  }

  async saveTaxonomy(userId: string, taxonomy: Taxonomy): Promise<TaxonomyDocument> {
    const now = new Date().toISOString();
    const result = await this.pool.query<{ revision: number; updated_at: string }>(
      `INSERT INTO taxonomy_documents (user_id, data, revision, updated_at) VALUES ($1, $2, 1, $3)
       ON CONFLICT (user_id) DO UPDATE
         SET data = $2, revision = taxonomy_documents.revision + 1, updated_at = $3
       RETURNING revision, updated_at`,
      [userId, JSON.stringify(taxonomy), now],
    );
    return { taxonomy, revision: result.rows[0].revision, updatedAt: result.rows[0].updated_at };
  }
}
