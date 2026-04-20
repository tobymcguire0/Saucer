import RandomDishPanel from "../features/browse/components/RandomDishPanel";
import SearchFilterPanel from "../features/browse/components/SearchFilterPanel";
import SidebarHeader from "../features/browse/components/SidebarHeader";
import { useAppSidebarViewModel } from "../features/app/useAppSidebarViewModel";
import ThemePalettePanel from "../features/theme/components/ThemePalettePanel";

function AppSidebar() {
  const {
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
      <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[30rem] xl:max-w-[30rem]">
        <SidebarHeader
          username={username}
          onLogout={onLogout}
          onUploadRecipe={onUploadRecipe}
        />
        
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
        <div className="xl:mt-auto">
          <ThemePalettePanel />
        </div>
      </aside>
    );
  }

export default AppSidebar;
