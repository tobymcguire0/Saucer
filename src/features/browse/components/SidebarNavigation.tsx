import type { AppView } from "../../../context/app-shell-context";

type SidebarNavigationProps = {
  activeView: AppView;
  setActiveWorkspace: (view: AppView) => void;
};

function SidebarNavigation({ activeView, setActiveWorkspace }: SidebarNavigationProps) {
  return (
    <div className="sidebar-section">
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
  );
}

export default SidebarNavigation;
