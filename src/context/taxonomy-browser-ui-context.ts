import { useShallow } from "zustand/react/shallow";

import { useTaxonomyUiStore } from "../features/taxonomy/useTaxonomyUiStore";

export type TaxonomyBrowserUiContextValue = {
  collapsedCategoryIds: Record<string, boolean>;
  toggleCategoryCollapsed: (categoryId: string) => void;
};

export function useTaxonomyBrowserUiContext(): TaxonomyBrowserUiContextValue {
  return useTaxonomyUiStore(
    useShallow((state) => ({
      collapsedCategoryIds: state.collapsedCategoryIds,
      toggleCategoryCollapsed: state.toggleCategoryCollapsed,
    })),
  );
}
