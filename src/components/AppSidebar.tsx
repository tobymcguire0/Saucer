import { useAppShellContext } from "../context/app-shell-context";
import { useRecipeEditorContext } from "../context/recipe-editor-context";
import { useSearchContext } from "../context/search-context";
import { useTaxonomyFilterUiContext } from "../context/taxonomy-filter-ui-context";
import { useTaxonomyContext } from "../context/taxonomy-context";
import RandomDishPanel from "../features/browse/components/RandomDishPanel";
import SearchFilterPanel from "../features/browse/components/SearchFilterPanel";
import SidebarHeader from "../features/browse/components/SidebarHeader";
import SidebarNavigation from "../features/browse/components/SidebarNavigation";
import { signOutRedirect } from "../App";
import { useAuth } from "react-oidc-context";

const sidebarTagSearchKey = "__all__";

function AppSidebar() {
  const { activeView, setActiveWorkspace } = useAppShellContext();
  const { openCreateEditor } = useRecipeEditorContext();
  const {
    query,
    groupByCategoryId,
    randomIngredientInput,
    updateSearchText,
    updateSortBy,
    updateGroupByCategory,
    updateRandomIngredientSearch,
    toggleFilterTag,
    chooseRandomRecipe,
  } = useSearchContext();
  const { sidebarCategoryInputs, setCategoryInput } = useTaxonomyFilterUiContext();
  const { taxonomy, taxonomyGroups, categoryLookup } = useTaxonomyContext();
  const sidebarTagInput = sidebarCategoryInputs[sidebarTagSearchKey] ?? "";
  const selectedSidebarTags = taxonomy.tags.filter((tag) => query.selectedTagIds.includes(tag.id));
  const auth = useAuth();

  return (
    <aside className="sidebar">
      <SidebarHeader
        username={auth.user?.profile.preferred_username}
        onLogout={signOutRedirect}
        onUploadRecipe={() => openCreateEditor("website")}
      />
      <SidebarNavigation activeView={activeView} setActiveWorkspace={setActiveWorkspace} />
      <RandomDishPanel
        randomIngredientInput={randomIngredientInput}
        updateRandomIngredientSearch={updateRandomIngredientSearch}
        chooseRandomRecipe={chooseRandomRecipe}
      />
      <SearchFilterPanel
        query={query}
        groupByCategoryId={groupByCategoryId}
        taxonomy={taxonomy}
        taxonomyGroups={taxonomyGroups}
        categoryLookup={categoryLookup}
        sidebarTagInput={sidebarTagInput}
        selectedSidebarTags={selectedSidebarTags}
        updateSearchText={updateSearchText}
        updateSortBy={updateSortBy}
        updateGroupByCategory={updateGroupByCategory}
        setCategoryInput={setCategoryInput}
        toggleFilterTag={toggleFilterTag}
        sidebarTagSearchKey={sidebarTagSearchKey}
      />
    </aside>
  );
}

export default AppSidebar;
