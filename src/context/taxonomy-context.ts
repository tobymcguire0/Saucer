import type { Taxonomy } from "../lib/models";
import type { TaxonomyCategoryGroup } from "../lib/taxonomyView";
import { createRequiredContext } from "./createRequiredContext";

export type TaxonomyContextValue = {
  taxonomy: Taxonomy;
  taxonomyGroups: TaxonomyCategoryGroup[];
  tagLookup: Map<string, Taxonomy["tags"][number]>;
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  mealTimeCategory?: Taxonomy["categories"][number];
};

export const [TaxonomyContext, useTaxonomyContext] =
  createRequiredContext<TaxonomyContextValue>("TaxonomyContext");
