import { useAuth } from "react-oidc-context";
import { useBrowseStore } from "../features/browse/useBrowseStore";
import { useRecipeEditorActions } from "../features/editor/useRecipeEditorViewModel";

function initialsOf(name?: string): string {
  if (!name) return "?";
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function AppHeader() {
  const auth = useAuth();
  const searchText = useBrowseStore((s) => s.query.searchText);
  const updateSearchText = useBrowseStore((s) => s.updateSearchText);
  const setActiveWorkspace = useBrowseStore((s) => s.setActiveWorkspace);
  const { openCreateEditor } = useRecipeEditorActions();

  const username =
    auth.user?.profile.preferred_username ??
    (auth.user?.profile.email as string | undefined) ??
    "Cook";

  return (
    <header className="page-header">
      <div className="page-header-left">
        <div className="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search recipes…"
            value={searchText}
            onChange={(e) => updateSearchText(e.target.value)}
            onFocus={() => setActiveWorkspace("search")}
          />
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openCreateEditor("website")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Import
        </button>
      </div>
      <div className="page-header-right">
        <button
          type="button"
          className="avatar"
          title={username}
          onClick={() => setActiveWorkspace("settings")}
        >
          {initialsOf(username)}
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
