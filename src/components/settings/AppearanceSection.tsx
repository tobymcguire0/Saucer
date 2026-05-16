import { useShallow } from "zustand/react/shallow";
import { usePreferencesStore } from "../../features/preferences/usePreferencesStore";
import { cn } from "../../lib/cn";

function AppearanceSection() {
  const prefs = usePreferencesStore(
    useShallow((s) => ({
      themeMode: s.themeMode,
      compactCards: s.compactCards,
      textSize: s.textSize,
      setThemeMode: s.setThemeMode,
      setCompactCards: s.setCompactCards,
      setTextSize: s.setTextSize,
    })),
  );

  return (
    <div>
      <h2 className="settings-section-title">Appearance</h2>
      <div className="settings-group">
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Theme</div>
            <div className="settings-row-desc">Choose light, dark, or follow the system.</div>
          </div>
          <select
            className="form-select"
            style={{ maxWidth: 160 }}
            value={prefs.themeMode}
            onChange={(e) => prefs.setThemeMode(e.target.value as "light" | "dark" | "system")}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System default</option>
          </select>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Compact cards</div>
            <div className="settings-row-desc">Show more recipes per row in the grid.</div>
          </div>
          <button
            type="button"
            className={cn("toggle", prefs.compactCards && "on")}
            onClick={() => prefs.setCompactCards(!prefs.compactCards)}
          />
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Text size</div>
            <div className="settings-row-desc">Increase global text size for readability.</div>
          </div>
          <select
            className="form-select"
            style={{ maxWidth: 140 }}
            value={prefs.textSize}
            onChange={(e) => prefs.setTextSize(e.target.value as "normal" | "large")}
          >
            <option value="normal">Normal</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default AppearanceSection;
