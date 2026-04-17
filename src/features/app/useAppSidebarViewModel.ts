import { useCallback, useMemo } from "react";
import { useAuth } from "react-oidc-context";

import { signOutRedirect } from "../auth/oidc";
import { useSearchViewModel } from "../browse/useSearchViewModel";
import { useRecipeEditorActions } from "../editor/useRecipeEditorViewModel";
import { useTaxonomyViewModel } from "../taxonomy/useTaxonomyViewModel";
import { useTaxonomyFilterUiViewModel } from "../taxonomy/useTaxonomyUiViewModels";
import { useAppShellViewModel } from "./useAppShellViewModel";

const sidebarTagSearchKey = "__all__";

export function useAppSidebarViewModel() {
  const auth = useAuth();
  const { activeView, setActiveWorkspace } = useAppShellViewModel();
  const { openCreateEditor } = useRecipeEditorActions();
  const search = useSearchViewModel();
  const { sidebarCategoryInputs, setCategoryInput } = useTaxonomyFilterUiViewModel();
  const { taxonomy, taxonomyGroups, categoryLookup } = useTaxonomyViewModel();
  const sidebarTagInput = sidebarCategoryInputs[sidebarTagSearchKey] ?? "";
  const selectedSidebarTags = useMemo(
    () => taxonomy.tags.filter((tag) => search.query.selectedTagIds.includes(tag.id)),
    [search.query.selectedTagIds, taxonomy.tags],
  );
  const setSidebarTagInput = useCallback(
    (value: string) => setCategoryInput("sidebar", sidebarTagSearchKey, value),
    [setCategoryInput],
  );
  const onUploadRecipe = useCallback(() => openCreateEditor("website"), [openCreateEditor]);
  const onLogout = useCallback(() => signOutRedirect(), []);

  return {
    activeView,
    setActiveWorkspace,
    username: auth.user?.profile.preferred_username,
    onLogout,
    onUploadRecipe,
    ...search,
    taxonomy,
    taxonomyGroups,
    categoryLookup,
    sidebarTagInput,
    selectedSidebarTags,
    setSidebarTagInput,
  };
}
