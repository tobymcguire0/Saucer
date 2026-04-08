import type { Category, Tag, Taxonomy } from "./models";

const defaultCategorySeed = [
  {
    name: "Meal-Time",
    description: "When the recipe is typically served.",
    tags: [
      { name: "Breakfast", aliases: [] },
      { name: "Brunch", aliases: [] },
      { name: "Lunch", aliases: [] },
      { name: "Dinner", aliases: [] },
      { name: "Dessert", aliases: [] },
      { name: "Snack", aliases: [] },
    ],
  },
  {
    name: "Cuisine",
    description: "Cuisine family or regional origin.",
    tags: [
      { name: "Italian", aliases: [] },
      { name: "French", aliases: [] },
      { name: "Spanish", aliases: [] },
      { name: "Mexican", aliases: [] },
      { name: "Indian", aliases: [] },
      { name: "Chinese", aliases: [] },
      { name: "Japanese", aliases: [] },
      { name: "Thai", aliases: [] },
      { name: "American", aliases: [] },
      { name: "Mediterranean", aliases: [] },
      { name: "Middle Eastern", aliases: ["Middle-East"] },
    ],
  },
  {
    name: "Ingredients",
    description: "Core ingredient families used in the dish.",
    tags: [
      { name: "Egg", aliases: ["eggs"] },
      { name: "Pasta", aliases: ["spaghetti", "linguine", "macaroni", "penne", "sphagetti"] },
      { name: "Rice", aliases: ["jasmine rice", "basmati"] },
      { name: "Chicken", aliases: [] },
      { name: "Beef", aliases: ["hamburger"] },
      { name: "Pork", aliases: ["chorizo"] },
      { name: "Fish", aliases: ["salmon", "cod", "tuna"] },
      { name: "Tomato", aliases: ["tomatoes"] },
      { name: "Olive", aliases: ["olives"] },
      { name: "Cheese", aliases: ["parmesan", "mozzarella", "feta"] },
      { name: "Potato", aliases: ["potatoes"] },
      { name: "Bean", aliases: ["beans", "chickpeas", "lentils"] },
      { name: "Tofu", aliases: [] },
      { name: "Mushroom", aliases: ["mushrooms"] },
      { name: "Bread", aliases: ["toast", "bun"] },
    ],
  },
  {
    name: "Dietary",
    description: "Dietary constraints or preference tags.",
    tags: [
      { name: "Vegan", aliases: [] },
      { name: "Vegetarian", aliases: [] },
      { name: "Gluten-Free", aliases: ["gluten free"] },
      { name: "Dairy-Free", aliases: ["dairy free"] },
      { name: "Nut-Free", aliases: ["nut free"] },
      { name: "High-Protein", aliases: ["high protein"] },
    ],
  },
  {
    name: "Cooking-Method",
    description: "Primary cooking approach.",
    tags: [
      { name: "Baked", aliases: ["oven baked"] },
      { name: "Fried", aliases: ["pan fried", "deep fried"] },
      { name: "Roasted", aliases: [] },
      { name: "Grilled", aliases: [] },
      { name: "Stewed", aliases: ["braised"] },
      { name: "Slow-Cooked", aliases: ["slow cooked"] },
      { name: "One-Pot", aliases: ["one pot"] },
      { name: "Raw", aliases: ["no cook"] },
    ],
  },
  {
    name: "Course",
    description: "Role of the recipe in a meal.",
    tags: [
      { name: "Appetizer", aliases: ["starter"] },
      { name: "Main", aliases: ["main course"] },
      { name: "Side", aliases: ["side dish"] },
      { name: "Soup", aliases: [] },
      { name: "Salad", aliases: [] },
      { name: "Dessert", aliases: [] },
    ],
  },
  {
    name: "Time",
    description: "Approximate time investment.",
    tags: [
      { name: "Quick", aliases: ["fast", "15 minute", "20 minute"] },
      { name: "30-Min", aliases: ["30 minute", "thirty minute"] },
      { name: "1-Hour-Plus", aliases: ["60 minute", "one hour"] },
    ],
  },
  {
    name: "Equipment",
    description: "Key tool or appliance used.",
    tags: [
      { name: "Oven", aliases: [] },
      { name: "Stovetop", aliases: ["skillet", "pan"] },
      { name: "Air Fryer", aliases: ["airfryer"] },
      { name: "Slow Cooker", aliases: ["crockpot"] },
      { name: "Blender", aliases: [] },
    ],
  },
  {
    name: "Occasion",
    description: "Good fit for a meal context or event.",
    tags: [
      { name: "Weeknight", aliases: [] },
      { name: "Holiday", aliases: [] },
      { name: "Party", aliases: [] },
      { name: "Meal Prep", aliases: ["meal-prep"] },
    ],
  },
  {
    name: "Flavor",
    description: "Dominant flavor profile.",
    tags: [
      { name: "Spicy", aliases: ["heat"] },
      { name: "Sweet", aliases: [] },
      { name: "Savory", aliases: [] },
      { name: "Tangy", aliases: ["zesty"] },
      { name: "Creamy", aliases: [] },
    ],
  },
] as const;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createDefaultTaxonomy(): Taxonomy {
  const categories: Category[] = defaultCategorySeed.map((category) => ({
    id: `category-${slugify(category.name)}`,
    name: category.name,
    description: category.description,
  }));

  const tags: Tag[] = defaultCategorySeed.flatMap((category) => {
    const categoryId = `category-${slugify(category.name)}`;
    return category.tags.map((tag) => ({
      id: `tag-${slugify(category.name)}-${slugify(tag.name)}`,
      categoryId,
      name: tag.name,
      aliases: [...tag.aliases],
    }));
  });

  return { categories, tags };
}
