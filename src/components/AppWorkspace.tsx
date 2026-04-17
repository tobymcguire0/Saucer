import BrowseWorkspace from "./Workspaces/BrowseWorkspace";
import RecipeDetailWorkspace from "./Workspaces/RecipeDetailWorkspace";
import TaxonomyWorkspace from "./Workspaces/TaxonomyWorkspace";
import { useAppWorkspaceViewModel } from "../features/app/useAppWorkspaceViewModel";

function AppWorkspace() {
  const { activeView, title } = useAppWorkspaceViewModel();

  return (
    <section className="content">
      <header className="content-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>{title}</h2>
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
