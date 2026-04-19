import RandomDishPanel from "../features/browse/components/RandomDishPanel";
import SearchFilterPanel from "../features/browse/components/SearchFilterPanel";
import SidebarHeader from "../features/browse/components/SidebarHeader";
import SidebarNavigation from "../features/browse/components/SidebarNavigation";
import { useAppSidebarViewModel } from "../features/app/useAppSidebarViewModel";

function AppSidebar() {
  const {
    activeView,
    setActiveWorkspace,
    username,
    onLogout,
    onUploadRecipe,
    query,
    groupByCategoryId,
    randomIngredientInput,
    updateSearchText,
    updateSortBy,
    updateGroupByCategory,
    updateRandomIngredientSearch,
    toggleFilterTag,
    chooseRandomRecipe,
    taxonomy,
    taxonomyGroups,
    categoryLookup,
    sidebarTagInput,
    selectedSidebarTags,
    setSidebarTagInput,
  } = useAppSidebarViewModel();

  return (
    <aside className="sidebar">
      <SidebarHeader
        username={username}
        onLogout={onLogout}
        onUploadRecipe={onUploadRecipe}
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
        setCategoryInput={(_scope, _categoryId, value) => setSidebarTagInput(value)}
        toggleFilterTag={toggleFilterTag}
        sidebarTagSearchKey="__all__"
      />
    </aside>
  );
}

export default AppSidebar;
