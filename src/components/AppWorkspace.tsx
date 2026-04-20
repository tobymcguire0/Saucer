import BrowseWorkspace from "./Workspaces/BrowseWorkspace";
import RecipeDetailWorkspace from "./Workspaces/RecipeDetailWorkspace";
import TaxonomyWorkspace from "./Workspaces/TaxonomyWorkspace";
import { useAppWorkspaceViewModel } from "../features/app/useAppWorkspaceViewModel";
import SidebarNavigation from "../features/browse/components/SidebarNavigation";

function AppWorkspace() {
  const { activeView, title, setActiveWorkspace } = useAppWorkspaceViewModel();

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="rounded-[var(--radius-card)] border border-panel-15 bg-background-0 px-5 py-4 shadow-[var(--shadow-panel)]">
        <div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text-60 pb-2">
            Workspace
          </p>
          <SidebarNavigation activeView={activeView} setActiveWorkspace={setActiveWorkspace} />
          <h2 className="text-xL font-semibold uppercase tracking-[0.24em] text-primary-80 pt-2">{title}</h2>
        </div>
      </header>

      {activeView === "recipeDetail" ? (
        <RecipeDetailWorkspace />
      ) : activeView === "recipes" ? (
        <BrowseWorkspace />
      ) : (
        <TaxonomyWorkspace />
      )}
    </section>
  );
}

export default AppWorkspace;
