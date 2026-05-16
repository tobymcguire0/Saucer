import AppHeader from "./AppHeader";
import BrowseWorkspace from "./Workspaces/BrowseWorkspace";
import RecipeDetailWorkspace from "./Workspaces/RecipeDetailWorkspace";
import EditorWorkspace from "./Workspaces/EditorWorkspace";
import SearchWorkspace from "./Workspaces/SearchWorkspace";
import SettingsWorkspace from "./Workspaces/SettingsWorkspace";
import { useBrowseStore } from "../features/browse/useBrowseStore";

function AppWorkspace() {
  const activeView = useBrowseStore((s) => s.activeView);
  const showAppHeader = activeView === "browse" || activeView === "search";

  return (
    <section className="main-content">
      {showAppHeader ? <AppHeader /> : null}
      {activeView === "browse" ? <BrowseWorkspace /> : null}
      {activeView === "detail" ? <RecipeDetailWorkspace /> : null}
      {activeView === "editor" ? <EditorWorkspace /> : null}
      {activeView === "search" ? <SearchWorkspace /> : null}
      {activeView === "settings" ? <SettingsWorkspace /> : null}
    </section>
  );
}

export default AppWorkspace;
