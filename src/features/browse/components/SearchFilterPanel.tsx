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
    <div className="rounded-[var(--radius-card)] border border-panel-15 bg-background-0 p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-text-60">Search and filter</h2>
      </div>
      <label className="field mt-4">
        <span className="text-sm font-medium text-text-50">Search</span>
        <input
          className="field-input"
          value={query.searchText}
          onChange={(event) => updateSearchText(event.currentTarget.value)}
          placeholder="Search title, ingredients, or instructions"
        />
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="field">
          <span className="text-sm font-medium text-text-50">Sort by</span>
          <select
            className="field-select"
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
          <span className="text-sm font-medium text-text-50">Group by</span>
          <select
            className="field-select"
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

      <div className="mt-5">
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
