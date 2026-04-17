type SidebarHeaderProps = {
  username?: string;
  onLogout: () => void;
  onUploadRecipe: () => void;
};

function SidebarHeader({ username, onLogout, onUploadRecipe }: SidebarHeaderProps) {
  return (
    <div className="sidebar-section">
      <h1>{username ? `${username}'s Saucer` : "Saucer"}</h1>
      <p className="eyebrow">Recipe Aggregator</p>
      <p className="muted">Upload, Save, and Search Recipes.</p>
      <div className="button-row">
        <button type="button" onClick={onLogout}>
          Logout
        </button>
        <button type="button" onClick={onUploadRecipe}>
          Upload Recipe
        </button>
      </div>
    </div>
  );
}

export default SidebarHeader;
