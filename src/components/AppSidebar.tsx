import { useShallow } from "zustand/react/shallow";

import { useBrowseStore } from "../features/browse/useBrowseStore";
import { useRecipeEditorActions } from "../features/editor/useRecipeEditorViewModel";
import { useTaxonomyViewModel } from "../features/taxonomy/useTaxonomyViewModel";
import { useSearchViewModel } from "../features/browse/useSearchViewModel";
import { cn } from "../lib/cn";

function AppSidebar() {
  const { activeView, setActiveWorkspace, toggleFilterTag, selectedTagIds } = useBrowseStore(
    useShallow((s) => ({
      activeView: s.activeView,
      setActiveWorkspace: s.setActiveWorkspace,
      toggleFilterTag: s.toggleFilterTag,
      selectedTagIds: s.query.selectedTagIds,
    })),
  );

  const search = useSearchViewModel();
  const { openCreateEditor } = useRecipeEditorActions();
  const { taxonomyGroups } = useTaxonomyViewModel();

  const cuisineGroup = taxonomyGroups.find((g) => g.category.name === "Cuisine");
  const mealGroup = taxonomyGroups.find((g) => g.category.name === "Meal-Time");

  const cuisineDots = [
    "#c4956a", "#e8835a", "#5a9e52", "#c46028",
    "#c87c20", "#d4a020", "#5a7ed4", "#c44848",
    "#7a5ac4", "#5aa898", "#d4956a",
  ];
  const mealDots = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#a855f7", "#06b6d4"];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V22h8v-7.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/></svg>
        </div>
        <span className="sidebar-logo-name">Saucer</span>
      </div>

      <nav className="sidebar-section">
        <div className="sidebar-section-label">Library</div>
        <div className="sidebar-nav">
          <button
            type="button"
            className={cn("sidebar-nav-item", activeView === "browse" && "active")}
            onClick={() => setActiveWorkspace("browse")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18M3 12h18M3 17h18"/></svg>
            All Recipes
          </button>
          <button
            type="button"
            className={cn("sidebar-nav-item", activeView === "search" && "active")}
            onClick={() => setActiveWorkspace("search")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
            Search
          </button>
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => openCreateEditor("website")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Import Recipe
          </button>
        </div>
      </nav>

      {cuisineGroup && cuisineGroup.tags.length > 0 ? (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Cuisine</div>
          <div className="sidebar-tag-list">
            {cuisineGroup.tags.slice(0, 11).map((tag, idx) => (
              <button
                key={tag.id}
                type="button"
                className={cn("sidebar-tag-item", selectedTagIds.includes(tag.id) && "active")}
                onClick={() => toggleFilterTag(tag.id)}
              >
                <span className="sidebar-tag-dot" style={{ background: cuisineDots[idx % cuisineDots.length] }} />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {mealGroup && mealGroup.tags.length > 0 ? (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Meal Type</div>
          <div className="sidebar-tag-list">
            {mealGroup.tags.map((tag, idx) => (
              <button
                key={tag.id}
                type="button"
                className={cn("sidebar-tag-item", selectedTagIds.includes(tag.id) && "active")}
                onClick={() => toggleFilterTag(tag.id)}
              >
                <span className="sidebar-tag-dot" style={{ background: mealDots[idx % mealDots.length] }} />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="sidebar-footer">
        <button type="button" className="btn-random" onClick={search.chooseRandomRecipe}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 4v5h5"/></svg>
          What's for dinner?
        </button>
        <button
          type="button"
          className={cn("sidebar-nav-item", activeView === "settings" && "active")}
          onClick={() => setActiveWorkspace("settings")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
