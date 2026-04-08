import { createRequiredContext } from "./createRequiredContext";

export type TaxonomyFilterScope = "sidebar" | "editor";

export type TaxonomyFilterUiContextValue = {
  sidebarCategoryInputs: Record<string, string>;
  editorCategoryInputs: Record<string, string>;
  setCategoryInput: (scope: TaxonomyFilterScope, categoryId: string, value: string) => void;
  resetCategoryInputs: (scope: TaxonomyFilterScope) => void;
};

export const [TaxonomyFilterUiContext, useTaxonomyFilterUiContext] =
  createRequiredContext<TaxonomyFilterUiContextValue>("TaxonomyFilterUiContext");
