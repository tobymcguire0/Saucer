import AppWorkspace from "./components/AppWorkspace";
import AppSidebar from "./components/AppSidebar";
import { useAppBootstrap } from "./features/app/useAppBootstrap";
import { useAppShellViewModel } from "./features/app/useAppShellViewModel";
import { useRequireAuth } from "./features/auth/useRequireAuth";
import { useSyncEffect } from "./features/sync/useSyncEffect";
import { usePreferencesEffect } from "./features/preferences/usePreferencesEffect";

function AppContent() {
  useAppBootstrap();
  useSyncEffect();
  usePreferencesEffect();
  const { loading } = useAppShellViewModel();

  return (
    <div className="app-shell">
      <AppSidebar />
      <AppWorkspace />
      {loading ? (
        <div className="fixed inset-0 z-30 grid place-items-center" style={{ background: "rgba(62,43,30,0.35)", backdropFilter: "blur(6px)" }}>
          <div className="btn btn-primary">Loading local Saucer…</div>
        </div>
      ) : null}
    </div>
  );
}

function App() {
  const auth = useRequireAuth();

  if (auth.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="btn btn-secondary">Loading…</div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div style={{ maxWidth: "32rem", padding: "var(--sp-6)", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--r-lg)" }}>
          <p className="text-xs font-semi" style={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--accent)" }}>
            Authentication
          </p>
          <h1 className="text-2xl font-bold" style={{ marginTop: "var(--sp-2)" }}>Sign-in needs attention</h1>
          <p className="text-sm text-muted" style={{ marginTop: "var(--sp-3)" }}>Authentication error: {auth.error.message}</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: "var(--sp-4)" }} onClick={() => auth.signinRedirect()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return <AppContent />;
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="btn btn-secondary">Redirecting to sign in…</div>
    </div>
  );
}

export default App;
