import AppWorkspace from "./components/AppWorkspace";
import AppSidebar from "./components/AppSidebar";
import RecipeEditorModal from "./components/RecipeEditorModal";
import StatusBar from "./components/StatusBar";
import { useAppBootstrap } from "./features/app/useAppBootstrap";
import { useAppShellViewModel } from "./features/app/useAppShellViewModel";
import { useRequireAuth } from "./features/auth/useRequireAuth";

function AppContent() {
  useAppBootstrap();
  const { loading } = useAppShellViewModel();

  return (
    <main className="app-shell">
      <AppSidebar />
      <AppWorkspace />
      <RecipeEditorModal />
      <StatusBar />
      {loading ? <div className="loading-overlay">Loading local Saucer...</div> : null}
    </main>
  );
}

function App() {
  const auth = useRequireAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return (
      <div>
        <p>Authentication error: {auth.error.message}</p>
        <button onClick={() => auth.signinRedirect()}>Try again</button>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return <AppContent />;
  }

  return <div>Redirecting to sign in…</div>;
}

export default App;
