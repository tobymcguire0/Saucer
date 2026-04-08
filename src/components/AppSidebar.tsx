import { useAppShellContext } from "../context/app-shell-context";
import { useRecipeEditorContext } from "../context/recipe-editor-context";
import { useSearchContext } from "../context/search-context";
import { useTaxonomyFilterUiContext } from "../context/taxonomy-filter-ui-context";
import { useTaxonomyContext } from "../context/taxonomy-context";
import TaxonomyCategoryPicker from "./taxonomy/TaxonomyCategoryPicker";
import { recipeSortOptions } from "../lib/models";
import { searchTags } from "../lib/taxonomy";
import { isRecipeSort } from "../lib/typeGuards";

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

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="eyebrow">Cookbook</p>
        <h1>Recipe aggregator</h1>
        <p className="muted">Upload, Save, and Search Recipes.</p>
        <div className="button-row">
          <button type="button" onClick={() => openCreateEditor("website")}>
            Upload Recipe
          </button>
        </div>
        <div className="button-row">
          <button
            type="button"
            className={
              activeView === "recipes" || activeView === "recipeDetail"
                ? "secondary nav-active"
                : "secondary"
            }
            onClick={() => setActiveWorkspace("recipes")}
          >
            Browse recipes
          </button>
          <button
            type="button"
            className={activeView === "taxonomy" ? "secondary nav-active" : "secondary"}
            onClick={() => setActiveWorkspace("taxonomy")}
          >
            Manage taxonomy
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-heading">
          <h2>Random dish</h2>
        </div>
        <p className="muted">Uses your active tag filters plus optional ingredient keywords.</p>
        <label className="field">
          <span>Required ingredients</span>
          <input
            value={randomIngredientInput}
            onChange={(event) => updateRandomIngredientSearch(event.currentTarget.value)}
            placeholder="egg, rice, tomato"
          />
        </label>
        <button type="button" onClick={chooseRandomRecipe}>
          Pick random recipe
        </button>
      </div>

      <div className="sidebar-section">
        <div className="section-heading">
          <h2>Search and filter</h2>
        </div>
        <label className="field">
          <span>Search</span>
          <input
            value={query.searchText}
            onChange={(event) => updateSearchText(event.currentTarget.value)}
            placeholder="Search title, ingredients, or instructions"
          />
        </label>

        <div className="two-column">
          <label className="field">
            <span>Sort by</span>
            <select
              value={query.sortBy}
              onChange={(event) => {
                const { value } = event.currentTarget;
                if (isRecipeSort(value)) {
                  updateSortBy(value);
                }
              }}
            >
              {recipeSortOptions.map((sortOption) => (
                <option key={sortOption} value={sortOption}>
                  {sortOption === "updated"
                    ? "Recently updated"
                    : sortOption === "mealType"
                      ? "Meal type"
                      : sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Group by</span>
            <select
              value={groupByCategoryId}
              onChange={(event) => updateGroupByCategory(event.currentTarget.value)}
            >
              <option value="">No grouping</option>
              {taxonomyGroups.map(({ category }) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-groups">
          <TaxonomyCategoryPicker
            categoryName="Tags"
            inputValue={sidebarTagInput}
            selectedTags={selectedSidebarTags}
            matches={searchTags(taxonomy, sidebarTagInput)}
            emptyMessage="No matching tags."
            inputLabel="Tag search"
            inputPlaceholder="Search tags across all categories"
            onInputChange={(value) => setCategoryInput("sidebar", sidebarTagSearchKey, value)}
            onToggleTag={toggleFilterTag}
            renderMatchMeta={(match) =>
              `${categoryLookup.get(match.tag.categoryId)?.name ?? "Unknown"} · ${match.matchedAlias ? `Alias: ${match.matchedAlias}` : match.matchType} · ${Math.round(match.score * 100)}%`
            }
          />
        </div>
      </div>
    </aside>
  );
}

export default AppSidebar;
