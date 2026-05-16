import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import RecipeCard from "../RecipeCard";
import { useBrowseStore } from "../../features/browse/useBrowseStore";
import { useTaxonomyViewModel } from "../../features/taxonomy/useTaxonomyViewModel";
import { useRecipeCatalogViewModel } from "../../features/browse/useRecipeCatalogViewModel";
import { useRecipeEditorActions } from "../../features/editor/useRecipeEditorViewModel";
import { useAppShellViewModel } from "../../features/app/useAppShellViewModel";
import { cn } from "../../lib/cn";

const QUICK_FILTER_TAGS = ["Quick", "Vegetarian", "Dinner", "Breakfast"];

function SearchWorkspace() {
  const { query, updateSearchText, toggleFilterTag, setMinRating, setMaxTotalMinutes, clearAllFilters } =
    useBrowseStore(
      useShallow((s) => ({
        query: s.query,
        updateSearchText: s.updateSearchText,
        toggleFilterTag: s.toggleFilterTag,
        setMinRating: s.setMinRating,
        setMaxTotalMinutes: s.setMaxTotalMinutes,
        clearAllFilters: s.clearAllFilters,
      })),
    );
  const { taxonomy, tagLookup } = useTaxonomyViewModel();
  const { visibleRecipes, recipes, deleteRecipe, updateRecipeRating } = useRecipeCatalogViewModel();
  const { openEditEditor } = useRecipeEditorActions();
  const { openRecipeDetail } = useAppShellViewModel();

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const id of r.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [recipes]);

  const cuisineCategory = taxonomy.categories.find((c) => c.name === "Cuisine");
  const mealCategory = taxonomy.categories.find((c) => c.name === "Meal-Time");
  const dietaryCategory = taxonomy.categories.find((c) => c.name === "Dietary");
  const cuisineTags = cuisineCategory ? taxonomy.tags.filter((t) => t.categoryId === cuisineCategory.id) : [];
  const mealTags = mealCategory ? taxonomy.tags.filter((t) => t.categoryId === mealCategory.id) : [];
  const dietaryTags = dietaryCategory ? taxonomy.tags.filter((t) => t.categoryId === dietaryCategory.id) : [];

  const hasActiveFilters =
    query.selectedTagIds.length > 0 ||
    query.searchText.length > 0 ||
    typeof query.minRating === "number" ||
    typeof query.maxTotalMinutes === "number";

  const quickFilterTagIds = QUICK_FILTER_TAGS.map((name) =>
    taxonomy.tags.find((t) => t.name === name)?.id,
  ).filter((id): id is string => Boolean(id));

  return (
    <div className="search-shell">
      <div className={cn("search-hero", query.searchText && "compact")}>
        <h1 className="search-hero-title">Find anything in your library</h1>
        <div className="search-hero-bar">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
          </svg>
          <input
            type="text"
            placeholder="Search recipes, ingredients, tags…"
            value={query.searchText}
            onChange={(e) => updateSearchText(e.target.value)}
            autoFocus
          />
        </div>
        <div className="quick-filters">
          {quickFilterTagIds.map((tagId) => (
            <button
              key={tagId}
              type="button"
              className={cn("filter-chip", query.selectedTagIds.includes(tagId) && "active")}
              onClick={() => toggleFilterTag(tagId)}
            >
              {tagLookup.get(tagId)?.name}
            </button>
          ))}
          <button
            type="button"
            className={cn("filter-chip", query.minRating === 4 && "active")}
            onClick={() => setMinRating(query.minRating === 4 ? undefined : 4)}
          >
            Top rated
          </button>
        </div>
      </div>

      <div className="results-layout">
        <aside className="filter-panel">
          {cuisineCategory ? (
            <div className="filter-group">
              <div className="filter-group-header">
                <span className="filter-group-title">Cuisine</span>
              </div>
              <div className="filter-group-body">
                {cuisineTags.map((tag) => (
                  <label key={tag.id} className="filter-option">
                    <input
                      type="checkbox"
                      checked={query.selectedTagIds.includes(tag.id)}
                      onChange={() => toggleFilterTag(tag.id)}
                    />
                    <span className="filter-option-label">{tag.name}</span>
                    <span className="filter-option-count">{tagCounts.get(tag.id) ?? 0}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {mealCategory ? (
            <div className="filter-group">
              <div className="filter-group-header">
                <span className="filter-group-title">Meal Type</span>
              </div>
              <div className="filter-group-body">
                {mealTags.map((tag) => (
                  <label key={tag.id} className="filter-option">
                    <input
                      type="checkbox"
                      checked={query.selectedTagIds.includes(tag.id)}
                      onChange={() => toggleFilterTag(tag.id)}
                    />
                    <span className="filter-option-label">{tag.name}</span>
                    <span className="filter-option-count">{tagCounts.get(tag.id) ?? 0}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="filter-group">
            <div className="filter-group-header"><span className="filter-group-title">Cook time</span></div>
            <div className="filter-group-body">
              {([
                { label: "Under 15 min", value: 15 },
                { label: "Under 30 min", value: 30 },
                { label: "Under 1 hour", value: 60 },
                { label: "Over 1 hour", value: undefined as number | undefined, over: true },
              ] as const).map((opt) => (
                <label key={opt.label} className="filter-option">
                  <input
                    type="radio"
                    name="cooktime"
                    checked={query.maxTotalMinutes === opt.value}
                    onChange={() => setMaxTotalMinutes(opt.value)}
                  />
                  <span className="filter-option-label">{opt.label}</span>
                </label>
              ))}
              {typeof query.maxTotalMinutes === "number" ? (
                <button type="button" className="clear-all-btn" onClick={() => setMaxTotalMinutes(undefined)}>Clear</button>
              ) : null}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-header"><span className="filter-group-title">Rating</span></div>
            <div className="filter-group-body">
              {[4.5, 4, 3].map((value) => (
                <label key={value} className="filter-option">
                  <input
                    type="radio"
                    name="rating"
                    checked={query.minRating === value}
                    onChange={() => setMinRating(value)}
                  />
                  <span className="filter-option-label">{value}+ stars</span>
                </label>
              ))}
              {typeof query.minRating === "number" ? (
                <button type="button" className="clear-all-btn" onClick={() => setMinRating(undefined)}>Clear</button>
              ) : null}
            </div>
          </div>

          {dietaryCategory && dietaryTags.length > 0 ? (
            <div className="filter-group">
              <div className="filter-group-header"><span className="filter-group-title">Tags</span></div>
              <div className="filter-group-body">
                {dietaryTags.map((tag) => (
                  <label key={tag.id} className="filter-option">
                    <input
                      type="checkbox"
                      checked={query.selectedTagIds.includes(tag.id)}
                      onChange={() => toggleFilterTag(tag.id)}
                    />
                    <span className="filter-option-label">{tag.name}</span>
                    <span className="filter-option-count">{tagCounts.get(tag.id) ?? 0}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <div className="results-pane">
          {hasActiveFilters ? (
            <div className="active-filters">
              <span className="active-filter-label">Active:</span>
              {query.selectedTagIds.map((tagId) => (
                <span key={tagId} className="active-filter-tag">
                  {tagLookup.get(tagId)?.name ?? tagId}
                  <button type="button" onClick={() => toggleFilterTag(tagId)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </span>
              ))}
              {typeof query.minRating === "number" ? (
                <span className="active-filter-tag">
                  {query.minRating}+ stars
                  <button type="button" onClick={() => setMinRating(undefined)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </span>
              ) : null}
              {typeof query.maxTotalMinutes === "number" ? (
                <span className="active-filter-tag">
                  Under {query.maxTotalMinutes} min
                  <button type="button" onClick={() => setMaxTotalMinutes(undefined)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </span>
              ) : null}
              <button type="button" className="clear-all-btn" onClick={clearAllFilters}>Clear all</button>
            </div>
          ) : null}

          <div className="results-header">
            <span className="results-count">
              {visibleRecipes.length} <span>result{visibleRecipes.length === 1 ? "" : "s"}</span>
            </span>
          </div>

          {visibleRecipes.length === 0 ? (
            <div className="search-empty">
              <div className="search-empty-icon">🔍</div>
              <div className="search-empty-title">No matches</div>
              <div className="search-empty-desc">Try a different search term or remove filters to see more recipes.</div>
            </div>
          ) : (
            <div className="recipe-grid">
              {visibleRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  tagLookup={tagLookup}
                  onEdit={openEditEditor}
                  onDelete={deleteRecipe}
                  onOpenDetail={openRecipeDetail}
                  onRate={updateRecipeRating}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchWorkspace;
