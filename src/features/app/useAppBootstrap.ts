import { useEffect, useMemo } from "react";

import { buildTaxonomyCategoryGroups } from "../../lib/taxonomyView";
import { useSaucerStore } from "../saucer/useSaucerStore";
import { useTaxonomyUiStore } from "../taxonomy/useTaxonomyUiStore";

export function useAppBootstrap() {
  const initialize = useSaucerStore((state) => state.initialize);
  const taxonomy = useSaucerStore((state) => state.taxonomy);
  const syncCollapsedCategoryIds = useTaxonomyUiStore((state) => state.syncCollapsedCategoryIds);
  const taxonomyGroups = useMemo(() => buildTaxonomyCategoryGroups(taxonomy), [taxonomy]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    syncCollapsedCategoryIds(taxonomyGroups.map(({ category }) => category.id));
  }, [syncCollapsedCategoryIds, taxonomyGroups]);
}
