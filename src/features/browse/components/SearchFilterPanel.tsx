import type { RecipeQuery, Taxonomy } from "../../../lib/models";
import type { TaxonomyCategoryGroup } from "../../../lib/taxonomyView";
import { recipeSortOptions } from "../../../lib/models";
import { searchTags } from "../../../lib/taxonomy";
import { isRecipeSort } from "../../../lib/typeGuards";
import TaxonomyCategoryPicker from "../../../components/taxonomy/TaxonomyCategoryPicker";

type SearchFilterPanelProps = {
  query: RecipeQuery;
  groupByCategoryId: string;
  taxonomy: Taxonomy;
  taxonomyGroups: TaxonomyCategoryGroup[];
  categoryLookup: Map<string, Taxonomy["categories"][number]>;
  sidebarTagInput: string;
  selectedSidebarTags: Taxonomy["tags"];
  updateSearchText: (searchText: string) => void;
  updateSortBy: (sortBy: RecipeQuery["sortBy"]) => void;
  updateGroupByCategory: (categoryId: string) => void;
  setCategoryInput: (scope: "sidebar", categoryId: string, value: string) => void;
  toggleFilterTag: (tagId: string) => void;
  sidebarTagSearchKey: string;
};

function SearchFilterPanel({
  query,
  groupByCategoryId,
  taxonomy,
  taxonomyGroups,
  categoryLookup,
  sidebarTagInput,
  selectedSidebarTags,
  updateSearchText,
  updateSortBy,
  updateGroupByCategory,
  setCategoryInput,
  toggleFilterTag,
  sidebarTagSearchKey,
}: SearchFilterPanelProps) {
  return (
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
  );
}

export default SearchFilterPanel;
