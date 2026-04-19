import { useTaxonomyViewModel } from "./useTaxonomyViewModel";
import { useTaxonomyAdminViewModel, useTaxonomyBrowserUiViewModel } from "./useTaxonomyUiViewModels";

export function useTaxonomyWorkspaceViewModel() {
  const { taxonomyGroups } = useTaxonomyViewModel();
  const { collapsedCategoryIds, toggleCategoryCollapsed } = useTaxonomyBrowserUiViewModel();
  const admin = useTaxonomyAdminViewModel();

  return {
    taxonomyGroups,
    collapsedCategoryIds,
    toggleCategoryCollapsed,
    ...admin,
  };
}
