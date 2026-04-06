import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

import type { Recipe, RecipeQuery, Taxonomy } from "./models";

let sqlPromise: Promise<SqlJsStatic> | undefined;

function loadSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => wasmUrl,
    });
  }

  return sqlPromise;
}

function escapeLike(value: string) {
  return `%${value.replace(/[%_]/g, "\\$&")}%`;
}

export class SqliteSearchIndex {
  private db: Database | undefined;

  private async ensureDb() {
    if (this.db) {
      return this.db;
    }

    const SQL = await loadSql();
    this.db = new SQL.Database();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cuisine TEXT,
        meal_type TEXT,
        rating REAL,
        updated_at TEXT,
        search_blob TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recipe_tags (
        recipe_id TEXT NOT NULL,
        tag_id TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);
    `);
    return this.db;
  }

  async rebuild(recipes: Recipe[], taxonomy: Taxonomy) {
    const db = await this.ensureDb();
    db.exec("DELETE FROM recipes; DELETE FROM recipe_tags; DELETE FROM tags;");

    const insertRecipe = db.prepare(`
      INSERT INTO recipes (id, title, cuisine, meal_type, rating, updated_at, search_blob)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTag = db.prepare("INSERT INTO tags (id, category_id, name) VALUES (?, ?, ?)");
    const insertRecipeTag = db.prepare("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)");

    taxonomy.tags.forEach((tag) => {
      insertTag.run([tag.id, tag.categoryId, tag.name]);
    });

    recipes.forEach((recipe) => {
      insertRecipe.run([
        recipe.id,
        recipe.title,
        recipe.cuisine ?? "",
        recipe.mealType ?? "",
        recipe.rating,
        recipe.updatedAt,
        [
          recipe.title,
          recipe.summary,
          recipe.cuisine,
          recipe.mealType,
          ...recipe.ingredients.map((ingredient) => ingredient.name),
          ...recipe.instructions,
        ]
          .filter(Boolean)
          .join(" "),
      ]);

      recipe.tagIds.forEach((tagId) => insertRecipeTag.run([recipe.id, tagId]));
    });

    insertRecipe.free();
    insertTag.free();
    insertRecipeTag.free();
  }

  async queryRecipeIds(query: RecipeQuery) {
    const db = await this.ensureDb();
    const clauses = ["1 = 1"];
    const params: Array<string | number> = [];

    if (query.searchText.trim()) {
      clauses.push("LOWER(search_blob) LIKE LOWER(?) ESCAPE '\\'");
      params.push(escapeLike(query.searchText.trim()));
    }

    query.requiredIngredientTerms.forEach((term) => {
      clauses.push("LOWER(search_blob) LIKE LOWER(?) ESCAPE '\\'");
      params.push(escapeLike(term));
    });

    if (query.selectedTagIds.length > 0) {
      clauses.push(`id IN (
        SELECT recipe_id FROM recipe_tags
        WHERE tag_id IN (${query.selectedTagIds.map(() => "?").join(", ")})
        GROUP BY recipe_id
        HAVING COUNT(DISTINCT tag_id) = ${query.selectedTagIds.length}
      )`);
      params.push(...query.selectedTagIds);
    }

    if (query.excludedTagIds.length > 0) {
      clauses.push(`id NOT IN (
        SELECT recipe_id FROM recipe_tags
        WHERE tag_id IN (${query.excludedTagIds.map(() => "?").join(", ")})
      )`);
      params.push(...query.excludedTagIds);
    }

    const sortColumnMap: Record<RecipeQuery["sortBy"], string> = {
      updated: "updated_at DESC",
      title: "title COLLATE NOCASE ASC",
      rating: "rating DESC, title COLLATE NOCASE ASC",
      cuisine: "cuisine COLLATE NOCASE ASC, title COLLATE NOCASE ASC",
      mealType: "meal_type COLLATE NOCASE ASC, title COLLATE NOCASE ASC",
    };

    const statement = db.prepare(
      `SELECT id FROM recipes WHERE ${clauses.join(" AND ")} ORDER BY ${sortColumnMap[query.sortBy]}`,
    );
    statement.bind(params);

    const ids: string[] = [];
    while (statement.step()) {
      const row = statement.getAsObject() as { id?: unknown };
      if (typeof row.id === "string") {
        ids.push(row.id);
      }
    }

    statement.free();
    return ids;
  }
}
