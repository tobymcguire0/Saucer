import AppWorkspace from "./components/AppWorkspace";
import AppSidebar from "./components/AppSidebar";
import RecipeEditorModal from "./components/RecipeEditorModal";
import StatusBar from "./components/StatusBar";
import { useAppBootstrap } from "./features/app/useAppBootstrap";
import { useAppShellViewModel } from "./features/app/useAppShellViewModel";
import { useRequireAuth } from "./features/auth/useRequireAuth";
import { useSyncEffect } from "./features/sync/useSyncEffect";

function AppContent() {
  useAppBootstrap();
  useSyncEffect();
  const { loading } = useAppShellViewModel();

  return (
    <main className="relative flex min-h-screen flex-col gap-6 px-6 py-6 pb-24 xl:flex-row">
      <AppSidebar />
      <AppWorkspace />
      <RecipeEditorModal />
      <StatusBar />
      {loading ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-text-100/50 backdrop-blur-sm">
          <div className="rounded-[var(--radius-card)] border border-panel-20 bg-background-0 px-6 py-4 text-lg font-semibold text-text-60 shadow-[var(--shadow-floating)]">
            Loading local Saucer...
          </div>
        </div>
      ) : null}
    </main>
  );
}

function App() {
  const auth = useRequireAuth();

  if (auth.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="rounded-[var(--radius-card)] border border-panel-20 bg-background-0 px-6 py-4 text-lg font-semibold text-text-60 shadow-[var(--shadow-panel)]">
          Loading...
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="flex max-w-lg flex-col gap-4 rounded-[var(--radius-card)] border border-accent-20 bg-background-0 p-6 shadow-[var(--shadow-panel)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-60">
              Authentication
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-60">
              Sign-in needs attention
            </h1>
          </div>
          <p className="text-sm leading-6 text-text-45">Authentication error: {auth.error.message}</p>
          <button type="button" className="btn-primary self-start" onClick={() => auth.signinRedirect()}>
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
      <div className="rounded-[var(--radius-card)] border border-panel-20 bg-background-0 px-6 py-4 text-lg font-semibold text-text-60 shadow-[var(--shadow-panel)]">
        Redirecting to sign in...
      </div>
    </div>
  );
}

export default App;
