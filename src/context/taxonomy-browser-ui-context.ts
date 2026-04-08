import { createRequiredContext } from "./createRequiredContext";

export type TaxonomyBrowserUiContextValue = {
  collapsedCategoryIds: Record<string, boolean>;
  toggleCategoryCollapsed: (categoryId: string) => void;
};

export const [TaxonomyBrowserUiContext, useTaxonomyBrowserUiContext] =
  createRequiredContext<TaxonomyBrowserUiContextValue>("TaxonomyBrowserUiContext");
