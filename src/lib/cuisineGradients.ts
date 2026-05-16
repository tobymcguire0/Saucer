const CUISINE_CLASSES: Record<string, string> = {
  japanese: "card-img-japanese",
  italian: "card-img-italian",
  baking: "card-img-baking",
  thai: "card-img-thai",
  "middle-eastern": "card-img-middleeastern",
  middleeastern: "card-img-middleeastern",
  soup: "card-img-soup",
  mexican: "card-img-mexican",
  dessert: "card-img-dessert",
  indian: "card-img-indian",
  american: "card-img-american",
  chinese: "card-img-chinese",
  french: "card-img-french",
  spanish: "card-img-spanish",
  mediterranean: "card-img-mediterranean",
};

const CUISINE_EMOJI: Record<string, string> = {
  japanese: "🍣",
  italian: "🍝",
  baking: "🥖",
  thai: "🍜",
  "middle-eastern": "🥙",
  middleeastern: "🥙",
  soup: "🍲",
  mexican: "🌮",
  dessert: "🍰",
  indian: "🍛",
  american: "🍔",
  chinese: "🥢",
  french: "🥐",
  spanish: "🥘",
  mediterranean: "🫒",
};

export function cuisineSlug(cuisine?: string): string {
  return (cuisine ?? "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
}

export function cuisineGradientClass(cuisine?: string): string {
  return CUISINE_CLASSES[cuisineSlug(cuisine)] ?? "";
}

export function cuisineEmoji(cuisine?: string, mealType?: string): string {
  const cSlug = cuisineSlug(cuisine);
  if (CUISINE_EMOJI[cSlug]) return CUISINE_EMOJI[cSlug];
  const mSlug = cuisineSlug(mealType);
  if (mSlug === "breakfast") return "🥞";
  if (mSlug === "lunch") return "🥗";
  if (mSlug === "dinner") return "🍽️";
  if (mSlug === "dessert") return "🍰";
  if (mSlug === "snack") return "🥨";
  return "🍴";
}
