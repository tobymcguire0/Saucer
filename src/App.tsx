import AppWorkspace from "./components/AppWorkspace";
import AppSidebar from "./components/AppSidebar";
import RecipeEditorModal from "./components/RecipeEditorModal";
import StatusBar from "./components/StatusBar";
import { useAppShellContext } from "./context/app-shell-context";
import { useAuth } from "react-oidc-context";

/** Redirect the browser to Cognito's hosted logout endpoint. */
export function signOutRedirect() {
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const logoutUri = window.location.origin;
  const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

function AppContent() {
  const { loading } = useAppShellContext();

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
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return <AppContent />;
  }

  // Not authenticated — redirect to Cognito login
  auth.signinRedirect();
  return <div>Redirecting to sign in…</div>;
}

export default App;
