import { useEffect } from "react";
import AppWorkspace from "./components/AppWorkspace";
import AppSidebar from "./components/AppSidebar";
import RecipeEditorModal from "./components/RecipeEditorModal";
import StatusBar from "./components/StatusBar";
import { useAppShellContext } from "./context/app-shell-context";
import AppProvider from "./context/AppProvider";
import { useAuth } from "react-oidc-context";

/** Clear local OIDC state and redirect to Cognito's hosted logout endpoint. */
export function signOutRedirect() {
  // Synchronously clear all OIDC keys from sessionStorage before navigating
  // so tokens are gone when Cognito redirects back to this origin.
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith("oidc.")) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => sessionStorage.removeItem(k));

  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const returnTo = window.location.origin;
  const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(returnTo)}`;
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

  useEffect(() => {
    if (
      !auth.isAuthenticated &&
      !auth.isLoading &&
      !auth.activeNavigator &&
      !auth.error
    ) {
      // Don't redirect if we're returning from Cognito with a callback
      const params = new URLSearchParams(window.location.search);
      if (!params.has("code") && !params.has("error")) {
        auth.signinRedirect();
      }
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.activeNavigator, auth.error]);

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
    return (
      <AppProvider>
        <AppContent />
      </AppProvider>
    );
  }

  return <div>Redirecting to sign in…</div>;
}

export default App;
