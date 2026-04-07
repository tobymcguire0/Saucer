import { recipeSortOptions, type Recipe, type RecipeQuery, type RecipeSort } from "../lib/models";
import type { TaxonomyCategoryGroup } from "../lib/taxonomyView";
import { isRecipeSort } from "../lib/typeGuards";

type AppView = "recipes" | "taxonomy" | "recipeDetail";

type AppSidebarProps = {
  activeView: AppView;
  query: RecipeQuery;
  taxonomyGroups: TaxonomyCategoryGroup[];
  groupByCategoryId: string;
  randomIngredientInput: string;
  selectedRandomRecipe?: Recipe;
  onUploadRecipe: () => void;
  onViewChange: (view: AppView) => void;
  onSearchTextChange: (searchText: string) => void;
  onSortChange: (sortBy: RecipeSort) => void;
  onGroupByCategoryChange: (categoryId: string) => void;
  onRandomIngredientInputChange: (value: string) => void;
  onToggleFilterTag: (tagId: string) => void;
  onChooseRandomRecipe: () => void;
};

function AppSidebar({
  activeView,
  query,
  taxonomyGroups,
  groupByCategoryId,
  randomIngredientInput,
  selectedRandomRecipe,
  onUploadRecipe,
  onViewChange,
  onSearchTextChange,
  onSortChange,
  onGroupByCategoryChange,
  onRandomIngredientInputChange,
  onToggleFilterTag,
  onChooseRandomRecipe,
}: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="eyebrow">Cookbook</p>
        <h1>Recipe aggregator</h1>
        <p className="muted">Upload, Save, and Search Recipes.</p>
        <div className="button-row">
          <button type="button" onClick={onUploadRecipe}>
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
            onClick={() => onViewChange("recipes")}
          >
            Browse recipes
          </button>
          <button
            type="button"
            className={activeView === "taxonomy" ? "secondary nav-active" : "secondary"}
            onClick={() => onViewChange("taxonomy")}
          >
            Manage taxonomy
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-heading">
          <h2>Search and filter</h2>
        </div>
        <label className="field">
          <span>Search</span>
          <input
            value={query.searchText}
            onChange={(event) => onSearchTextChange(event.currentTarget.value)}
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
                  onSortChange(value);
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
              onChange={(event) => onGroupByCategoryChange(event.currentTarget.value)}
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
          {taxonomyGroups.map(({ category, tags }) => (
            <section key={category.id} className="filter-group">
              <h3>{category.name}</h3>
              <div className="chip-wrap">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={query.selectedTagIds.includes(tag.id) ? "chip chip-active" : "chip"}
                    onClick={() => onToggleFilterTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </section>
          ))}
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
            onChange={(event) => onRandomIngredientInputChange(event.currentTarget.value)}
            placeholder="egg, rice, tomato"
          />
        </label>
        <button type="button" onClick={onChooseRandomRecipe}>
          Pick random recipe
        </button>
        {selectedRandomRecipe ? (
          <div className="random-card">
            <strong>{selectedRandomRecipe.title}</strong>
            <span>{selectedRandomRecipe.summary}</span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export default AppSidebar;
