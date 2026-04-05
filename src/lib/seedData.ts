import type { Recipe, Taxonomy } from "./models";
import { buildTagSuggestions } from "./taxonomy";

function resolveSeedTagIds(
  recipe: Omit<Recipe, "tagIds"> & { tagIds?: string[] },
  taxonomy: Taxonomy,
) {
  return buildTagSuggestions(
    {
      title: recipe.title,
      summary: recipe.summary,
      mealType: recipe.mealType ?? "",
      cuisine: recipe.cuisine ?? "",
      instructionsText: recipe.instructions.join("\n"),
      ingredients: recipe.ingredients,
      ingredientsText: recipe.ingredients.map((ingredient) => ingredient.raw).join("\n"),
    },
    taxonomy,
  )
    .map((suggestion) => suggestion.tagId)
    .filter((tagId): tagId is string => Boolean(tagId));
}

export function createSeedRecipes(taxonomy: Taxonomy): Recipe[] {
  const now = new Date().toISOString();
  const baseRecipes: Array<Omit<Recipe, "tagIds">> = [
    {
      id: "recipe-shakshuka",
      title: "Smoky Shakshuka",
      summary: "Eggs poached in a spiced tomato sauce for an easy brunch or dinner.",
      sourceType: "manual",
      ingredients: [
        { id: "ingredient-1", name: "Eggs", raw: "4 eggs" },
        { id: "ingredient-2", name: "Tomatoes", raw: "1 can crushed tomatoes" },
        { id: "ingredient-3", name: "Olive oil", raw: "2 tbsp olive oil" },
        { id: "ingredient-4", name: "Feta", raw: "50g feta cheese" },
      ],
      instructions: [
        "Warm olive oil in a skillet and bloom the spices.",
        "Simmer tomatoes until slightly thickened.",
        "Crack eggs into the sauce and cook until set.",
        "Finish with feta and herbs.",
      ],
      servings: "2 to 3 people",
      cuisine: "Middle Eastern",
      mealType: "Brunch",
      rating: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "recipe-lemon-pasta",
      title: "Lemon Pasta",
      summary: "A quick and bright pasta for busy weeknights.",
      sourceType: "manual",
      ingredients: [
        { id: "ingredient-5", name: "Spaghetti", raw: "300g spaghetti" },
        { id: "ingredient-6", name: "Lemon", raw: "2 lemons" },
        { id: "ingredient-7", name: "Parmesan", raw: "60g parmesan" },
        { id: "ingredient-8", name: "Olive oil", raw: "3 tbsp olive oil" },
      ],
      instructions: [
        "Cook the pasta until al dente.",
        "Whisk lemon juice, zest, olive oil, and pasta water.",
        "Toss pasta with sauce and parmesan.",
      ],
      servings: "4 people",
      cuisine: "Italian",
      mealType: "Dinner",
      rating: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "recipe-fried-rice",
      title: "Veggie Fried Rice",
      summary: "Leftover rice transformed into a fast, savory dinner.",
      sourceType: "manual",
      ingredients: [
        { id: "ingredient-9", name: "Rice", raw: "3 cups cooked rice" },
        { id: "ingredient-10", name: "Egg", raw: "2 eggs" },
        { id: "ingredient-11", name: "Mushrooms", raw: "1 cup mushrooms" },
        { id: "ingredient-12", name: "Soy sauce", raw: "2 tbsp soy sauce" },
      ],
      instructions: [
        "Scramble the eggs in a hot pan.",
        "Cook mushrooms until browned.",
        "Add rice and soy sauce and fry until fragrant.",
      ],
      servings: "3 people",
      cuisine: "Chinese",
      mealType: "Dinner",
      rating: 4,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return baseRecipes.map((recipe) => ({
    ...recipe,
    tagIds: resolveSeedTagIds(recipe, taxonomy),
  }));
}
