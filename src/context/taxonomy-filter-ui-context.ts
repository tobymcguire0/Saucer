import { useShallow } from "zustand/react/shallow";

import { useTaxonomyUiStore } from "../features/taxonomy/useTaxonomyUiStore";
import type { TaxonomyFilterScope } from "../features/taxonomy/types";

export type { TaxonomyFilterScope };

export type TaxonomyFilterUiContextValue = {
  sidebarCategoryInputs: Record<string, string>;
  editorCategoryInputs: Record<string, string>;
  setCategoryInput: (scope: TaxonomyFilterScope, categoryId: string, value: string) => void;
  resetCategoryInputs: (scope: TaxonomyFilterScope) => void;
};

export function useTaxonomyFilterUiContext(): TaxonomyFilterUiContextValue {
  return useTaxonomyUiStore(
    useShallow((state) => ({
      sidebarCategoryInputs: state.sidebarCategoryInputs,
      editorCategoryInputs: state.editorCategoryInputs,
      setCategoryInput: state.setCategoryInput,
      resetCategoryInputs: state.resetCategoryInputs,
    })),
  );
}
