import type { Taxonomy } from "./types.js";

interface CategorySeed {
  name: string;
  description: string;
  tags: string[];
}

const defaultCategorySeed: CategorySeed[] = [
  {
    name: "Meal-Time",
    description: "When the recipe is typically served.",
    tags: ["Breakfast", "Brunch", "Lunch", "Dinner", "Dessert", "Snack"],
  },
  {
    name: "Cuisine",
    description: "Cuisine family or regional origin.",
    tags: [
      "Italian",
      "French",
      "Spanish",
      "Mexican",
      "Indian",
      "Chinese",
      "Japanese",
      "Thai",
      "American",
      "Mediterranean",
      "Middle Eastern",
    ],
  },
  {
    name: "Ingredients",
    description: "Core ingredient families used in the dish.",
    tags: [
      "Egg",
      "Pasta",
      "Rice",
      "Chicken",
      "Beef",
      "Pork",
      "Fish",
      "Tomato",
      "Olive",
      "Cheese",
      "Potato",
      "Bean",
      "Tofu",
      "Mushroom",
      "Bread",
    ],
  },
  {
    name: "Dietary",
    description: "Dietary constraints or preference tags.",
    tags: ["Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free", "Nut-Free", "High-Protein"],
  },
  {
    name: "Cooking-Method",
    description: "Primary cooking approach.",
    tags: ["Baked", "Fried", "Roasted", "Grilled", "Stewed", "Slow-Cooked", "One-Pot", "Raw"],
  },
  {
    name: "Course",
    description: "Role of the recipe in a meal.",
    tags: ["Appetizer", "Main", "Side", "Soup", "Salad", "Dessert"],
  },
  {
    name: "Time",
    description: "Approximate time investment.",
    tags: ["Quick", "30-Min", "1-Hour-Plus"],
  },
  {
    name: "Equipment",
    description: "Key tool or appliance used.",
    tags: ["Oven", "Stovetop", "Air Fryer", "Slow Cooker", "Blender"],
  },
  {
    name: "Occasion",
    description: "Good fit for a meal context or event.",
    tags: ["Weeknight", "Holiday", "Party", "Meal Prep"],
  },
  {
    name: "Flavor",
    description: "Dominant flavor profile.",
    tags: ["Spicy", "Sweet", "Savory", "Tangy", "Creamy"],
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createDefaultTaxonomy(): Taxonomy {
  return {
    categories: defaultCategorySeed.map((category) => ({
      id: `category-${slugify(category.name)}`,
      name: category.name,
      description: category.description,
    })),
    tags: defaultCategorySeed.flatMap((category) =>
      category.tags.map((tagName) => ({
        id: `tag-${slugify(category.name)}-${slugify(tagName)}`,
        categoryId: `category-${slugify(category.name)}`,
        name: tagName,
        aliases: [],
      })),
    ),
  };
}
