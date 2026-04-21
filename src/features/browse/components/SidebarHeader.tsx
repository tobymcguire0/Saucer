type SidebarHeaderProps = {
  username?: string;
  onLogout: () => void;
  onUploadRecipe: () => void;
};

function SidebarHeader({ username, onLogout, onUploadRecipe }: SidebarHeaderProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-panel-80 bg-panel-15 p-5 shadow-[var(--shadow-panel)]">
      <h1 className="text-3xl font-semibold tracking-tight text-text-60">
        {username ? `${username}'s Saucer` : "Saucer"}
      </h1>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary-60">
        Recipe Aggregator
      </p>
      <p className="mt-2 text-sm leading-6 text-text-35">Upload, Save, and Search Recipes.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={onLogout}>
          Logout
        </button>
        <button type="button" className="btn-primary" onClick={onUploadRecipe}>
          Upload Recipe
        </button>
      </div>
    </div>
  );
}

export default SidebarHeader;
