import type { Category, Tag, Taxonomy } from "./models";

export interface TaxonomyCategoryGroup {
  category: Category;
  tags: Tag[];
}

export function buildTaxonomyCategoryGroups(taxonomy: Taxonomy): TaxonomyCategoryGroup[] {
  const tagsByCategoryId = new Map<string, Tag[]>();

  for (const tag of taxonomy.tags) {
    const categoryTags = tagsByCategoryId.get(tag.categoryId);
    if (categoryTags) {
      categoryTags.push(tag);
      continue;
    }

    tagsByCategoryId.set(tag.categoryId, [tag]);
  }

  return taxonomy.categories.map((category) => ({
    category,
    tags: tagsByCategoryId.get(category.id) ?? [],
  }));
}
