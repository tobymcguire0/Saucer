import AppWorkspace from "./components/AppWorkspace";
import AppSidebar from "./components/AppSidebar";
import RecipeEditorModal from "./components/RecipeEditorModal";
import StatusBar from "./components/StatusBar";
import AppProvider from "./context/AppProvider";
import { useAppShellContext } from "./context/app-shell-context";

function AppContent() {
  const { loading } = useAppShellContext();

  return (
    <main className="app-shell">
      <AppSidebar />
      <AppWorkspace />
      <RecipeEditorModal />
      <StatusBar />
      {loading ? <div className="loading-overlay">Loading local cookbook...</div> : null}
    </main>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
