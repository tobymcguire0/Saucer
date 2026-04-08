import { useAppShellContext } from "../context/app-shell-context";
import BrowseWorkspace from "./Workspaces/BrowseWorkspace";
import RecipeDetailWorkspace from "./Workspaces/RecipeDetailWorkspace";
import TaxonomyWorkspace from "./Workspaces/TaxonomyWorkspace";

function AppWorkspace() {
  const { activeView } = useAppShellContext();

  return (
    <section className="content">
      <header className="content-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>
            {activeView === "recipes"
              ? "Browse recipes"
              : activeView === "recipeDetail"
                ? "Recipe details"
                : "Manage categories and tags"}
          </h2>
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
