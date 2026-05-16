import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import RecipeCard from "../RecipeCard";
import { useBrowseWorkspaceViewModel } from "../../features/browse/useBrowseWorkspaceViewModel";
import { useBrowseStore } from "../../features/browse/useBrowseStore";
import { useTaxonomyViewModel } from "../../features/taxonomy/useTaxonomyViewModel";
import { useRecipeEditorActions } from "../../features/editor/useRecipeEditorViewModel";
import { usePreferencesStore } from "../../features/preferences/usePreferencesStore";
import { cn } from "../../lib/cn";
import type { RecipeSort } from "../../lib/models";

const MEAL_TAG_NAMES = ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack"];

function BrowseWorkspace() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const compact = usePreferencesStore((s) => s.compactCards);

  const { visibleRecipes, deleteRecipe, updateRecipeRating, openEditEditor, openRecipeDetail, tagLookup } =
    useBrowseWorkspaceViewModel();

  const { taxonomy } = useTaxonomyViewModel();
  const { openCreateEditor } = useRecipeEditorActions();
  const { query, toggleFilterTag, setMinRating, updateSortBy } = useBrowseStore(
    useShallow((s) => ({
      query: s.query,
      toggleFilterTag: s.toggleFilterTag,
      setMinRating: s.setMinRating,
      updateSortBy: s.updateSortBy,
    })),
  );

  const mealTags = MEAL_TAG_NAMES.map((name) =>
    taxonomy.tags.find((t) => t.name === name),
  ).filter((t): t is NonNullable<typeof t> => Boolean(t));

  const allActive = query.selectedTagIds.length === 0;
  const isTopRated = query.minRating === 4;

  return (
    <>
      <div className="filter-bar">
        <button
          type="button"
          className={cn("filter-chip", allActive && "active")}
          onClick={() => {
            useBrowseStore.getState().setSelectedTagIds([]);
          }}
        >
          All
        </button>
        {mealTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={cn("filter-chip", query.selectedTagIds.includes(tag.id) && "active")}
            onClick={() => toggleFilterTag(tag.id)}
          >
            {tag.name}
          </button>
        ))}
        <span style={{ width: 1, height: 24, background: "var(--border)", margin: "0 var(--sp-2)" }} />
        <button
          type="button"
          className={cn("filter-chip", isTopRated && "active")}
          onClick={() => setMinRating(isTopRated ? undefined : 4)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg>
          Top Rated
        </button>

        <div className="sort-menu">
          <select
            className="sort-select"
            value={query.sortBy}
            onChange={(e) => updateSortBy(e.target.value as RecipeSort)}
          >
            <option value="updated">Recently added</option>
            <option value="title">A → Z</option>
            <option value="rating">Highest rated</option>
            <option value="cuisine">By cuisine</option>
          </select>
          <div className="grid-toggle">
            <button
              type="button"
              className={cn("grid-toggle-btn", view === "grid" && "active")}
              onClick={() => setView("grid")}
              title="Grid view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            <button
              type="button"
              className={cn("grid-toggle-btn", view === "list" && "active")}
              onClick={() => setView("list")}
              title="List view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {visibleRecipes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍳</div>
            <div className="empty-title">No recipes found</div>
            <div className="empty-desc">Try adjusting your filters or import a new recipe to get cooking.</div>
            <button type="button" className="btn btn-primary" onClick={() => openCreateEditor("website")}>
              Import recipe
            </button>
          </div>
        ) : (
          <div className={cn("recipe-grid", view === "list" && "list", compact && view === "grid" && "compact")}>
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
    </>
  );
}

export default BrowseWorkspace;
