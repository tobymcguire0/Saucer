import { useShallow } from "zustand/react/shallow";
import { usePreferencesStore } from "../../features/preferences/usePreferencesStore";
import { cn } from "../../lib/cn";

function initialsOf(name: string) {
  return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

function ProfileSection({ username, onLogout }: { username: string; onLogout: () => void }) {
  const prefs = usePreferencesStore(
    useShallow((s) => ({
      showCookTimeOnCards: s.showCookTimeOnCards,
      autoSuggestTagsOnImport: s.autoSuggestTagsOnImport,
      defaultServings: s.defaultServings,
      setShowCookTimeOnCards: s.setShowCookTimeOnCards,
      setAutoSuggestTagsOnImport: s.setAutoSuggestTagsOnImport,
      setDefaultServings: s.setDefaultServings,
    })),
  );

  return (
    <div>
      <h2 className="settings-section-title">Profile</h2>
      <div className="profile-row">
        <div className="profile-avatar-lg">{initialsOf(username)}</div>
        <div className="profile-info">
          <div className="profile-info-name">{username}</div>
          <div className="profile-info-meta">Signed in via Cognito</div>
        </div>
        <button type="button" className="btn btn-secondary btn-sm">Change Photo</button>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">App Preferences</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Show cook time on cards</div>
            <div className="settings-row-desc">Display servings / time inline on each recipe card.</div>
          </div>
          <button
            type="button"
            className={cn("toggle", prefs.showCookTimeOnCards && "on")}
            onClick={() => prefs.setShowCookTimeOnCards(!prefs.showCookTimeOnCards)}
            aria-label="Toggle cook time on cards"
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Auto-suggest tags on import</div>
            <div className="settings-row-desc">Use the taxonomy engine to propose tags when importing.</div>
          </div>
          <button
            type="button"
            className={cn("toggle", prefs.autoSuggestTagsOnImport && "on")}
            onClick={() => prefs.setAutoSuggestTagsOnImport(!prefs.autoSuggestTagsOnImport)}
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Default serving size</div>
            <div className="settings-row-desc">New recipes start with this many servings.</div>
          </div>
          <select
            className="form-select"
            style={{ maxWidth: 140 }}
            value={prefs.defaultServings}
            onChange={(e) => prefs.setDefaultServings(Number(e.target.value) as 2 | 4 | 6)}
          >
            <option value={2}>2 servings</option>
            <option value={4}>4 servings</option>
            <option value={6}>6 servings</option>
          </select>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-title">Account</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Sign out</div>
            <div className="settings-row-desc">End your session and return to sign-in.</div>
          </div>
          <button type="button" className="btn btn-danger btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSection;
