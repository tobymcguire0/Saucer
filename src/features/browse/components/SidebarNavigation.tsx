import { cn } from "../../../lib/cn";
import type { AppView } from "../types";

type SidebarNavigationProps = {
  activeView: AppView;
  setActiveWorkspace: (view: AppView) => void;
};

function SidebarNavigation({ activeView, setActiveWorkspace }: SidebarNavigationProps) {
  const browseActive = activeView === "recipes" || activeView === "recipeDetail";
  const taxonomyActive = activeView === "taxonomy";

  return (
    
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={cn(
            "btn-secondary flex-1",
            browseActive && "border-accent-60 bg-background-5 text-primary-75 ring-4 ring-primary-5",
          )}
          aria-pressed={browseActive}
          data-active={browseActive}
          onClick={() => setActiveWorkspace("recipes")}
        >
          Browse recipes
        </button>
        <button
          type="button"
          className={cn(
            "btn-secondary flex-1",
            taxonomyActive && "border-accent-35 bg-panel-10 text-primary-75 ring-4 ring-primary-5",
          )}
          aria-pressed={taxonomyActive}
          data-active={taxonomyActive}
          onClick={() => setActiveWorkspace("taxonomy")}
        >
          Manage taxonomy
        </button>
      </div>
  );
}

export default SidebarNavigation;
