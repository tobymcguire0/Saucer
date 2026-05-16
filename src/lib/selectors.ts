import type {
  RandomRecipeRequest,
  Recipe,
  RecipeQuery,
  Taxonomy,
} from "./models";
import { normalizeTerm } from "./taxonomy";

function extractTotalMinutes(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d+)\s*(h|hr|hour|min|m)?/i);
  if (!match) return undefined;
  const n = Number(match[1]);
  if (Number.isNaN(n)) return undefined;
  const unit = (match[2] ?? "min").toLowerCase();
  return unit.startsWith("h") ? n * 60 : n;
}

function sortRecipes(recipes: Recipe[], sortBy: RecipeQuery["sortBy"]) {
  const copy = [...recipes];
  copy.sort((left, right) => {
    switch (sortBy) {
      case "title":
        return left.title.localeCompare(right.title);
      case "rating":
        return right.rating - left.rating || left.title.localeCompare(right.title);
      case "cuisine":
        return (left.cuisine ?? "").localeCompare(right.cuisine ?? "") || left.title.localeCompare(right.title);
      case "mealType":
        return (left.mealType ?? "").localeCompare(right.mealType ?? "") || left.title.localeCompare(right.title);
      case "updated":
      default:
        return right.updatedAt.localeCompare(left.updatedAt);
    }
  });
  return copy;
}

export function filterRecipes(
  recipes: Recipe[],
  query: RecipeQuery,
) {
  const search = normalizeTerm(query.searchText);
  const requiredIngredients = query.requiredIngredientTerms.map(normalizeTerm).filter(Boolean);

  return sortRecipes(
    recipes.filter((recipe) => {
      const searchHaystack = normalizeTerm(
        [recipe.title, recipe.summary, recipe.cuisine, recipe.mealType]
          .concat(recipe.ingredients.map((ingredient) => ingredient.name))
          .concat(recipe.instructions.map((step) => step.text))
          .join(" "),
      );

      if (search && !searchHaystack.includes(search)) {
        return false;
      }

      if (query.selectedTagIds.some((tagId) => !recipe.tagIds.includes(tagId))) {
        return false;
      }

      if (query.excludedTagIds.some((tagId) => recipe.tagIds.includes(tagId))) {
        return false;
      }

      if (
        requiredIngredients.some((term) =>
          !recipe.ingredients.some((ingredient) => normalizeTerm(ingredient.name).includes(term)),
        )
      ) {
        return false;
      }

      if (typeof query.minRating === "number" && recipe.rating < query.minRating) {
        return false;
      }

      if (typeof query.maxTotalMinutes === "number") {
        const minutes = extractTotalMinutes(recipe.servings);
        if (minutes !== undefined && minutes > query.maxTotalMinutes) {
          return false;
        }
      }

      return true;
    }),
    query.sortBy,
  );
}

export function groupRecipesByCategory(
  recipes: Recipe[],
  taxonomy: Taxonomy,
  categoryId: string,
) {
  const categoryTags = taxonomy.tags.filter((tag) => tag.categoryId === categoryId);
  return categoryTags
    .map((tag) => ({
      id: tag.id,
      label: tag.name,
      recipes: recipes.filter((recipe) => recipe.tagIds.includes(tag.id)),
    }))
    .filter((section) => section.recipes.length > 0);
}

export function pickRandomRecipe(recipes: Recipe[], request: RandomRecipeRequest) {
  const filtered = filterRecipes(recipes, {
    searchText: "",
    selectedTagIds: request.requiredTagIds,
    excludedTagIds: request.excludedTagIds,
    requiredIngredientTerms: request.requiredIngredientTerms,
    sortBy: "updated",
  });

  if (filtered.length === 0) {
    return undefined;
  }

  return filtered[Math.floor(Math.random() * filtered.length)];
}
