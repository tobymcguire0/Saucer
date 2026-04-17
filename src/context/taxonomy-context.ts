import { useMemo } from "react";

import { useSaucerStore } from "../features/saucer/useSaucerStore";
import type { Taxonomy } from "../lib/models";
import { getCategoryByName } from "../lib/taxonomy";
import type { TaxonomyCategoryGroup } from "../lib/taxonomyView";
import { buildTaxonomyCategoryGroups } from "../lib/taxonomyView";

export type TaxonomyContextValue = {
  taxonomy: Taxonomy;
  taxonomyGroups: TaxonomyCategoryGroup[];
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  mealTimeCategory?: Taxonomy["categories"][number];
};

export function useTaxonomyContext(): TaxonomyContextValue {
  const taxonomy = useSaucerStore((state) => state.taxonomy);

  return useMemo(() => {
    const taxonomyGroups = buildTaxonomyCategoryGroups(taxonomy);
    const tagLookup = new Map(taxonomy.tags.map((tag) => [tag.id, tag]));
    const categoryLookup = new Map(taxonomy.categories.map((category) => [category.id, category]));

    return {
      taxonomy,
      taxonomyGroups,
      tagLookup,
      categoryLookup,
      mealTimeCategory: getCategoryByName(taxonomy, "Meal-Time"),
    };
  }, [taxonomy]);
}
