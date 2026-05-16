import { useState } from "react";
import { useAuth } from "react-oidc-context";

import { signOutRedirect } from "../../features/auth/oidc";
import ProfileSection from "../settings/ProfileSection";
import TaxonomySection from "../settings/TaxonomySection";
import BackupSection from "../settings/BackupSection";
import AppearanceSection from "../settings/AppearanceSection";
import AboutSection from "../settings/AboutSection";
import { cn } from "../../lib/cn";
import { useAppShellViewModel } from "../../features/app/useAppShellViewModel";

type SectionKey = "profile" | "taxonomy" | "backup" | "appearance" | "about";

function SettingsWorkspace() {
  const [section, setSection] = useState<SectionKey>("profile");
  const auth = useAuth();
  const { returnToMainView } = useAppShellViewModel();
  const username =
    (auth.user?.profile.preferred_username as string | undefined) ??
    (auth.user?.profile.email as string | undefined) ??
    "Cook";

  return (
    <div className="settings-layout">
      <nav className="settings-nav-panel">
        <div className="settings-nav-section">
          <button
            type="button"
            className="icon-btn settings-close-btn"
            aria-label="Close settings"
            onClick={returnToMainView}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="settings-nav-section-label">Account</div>
          <button type="button" className={cn("settings-nav-item", section === "profile" && "active")} onClick={() => setSection("profile")}>
            Profile
          </button>
        </div>
        <div className="settings-nav-section">
          <div className="settings-nav-section-label">Library</div>
          <button type="button" className={cn("settings-nav-item", section === "taxonomy" && "active")} onClick={() => setSection("taxonomy")}>
            Taxonomy
          </button>
          <button type="button" className={cn("settings-nav-item", section === "backup" && "active")} onClick={() => setSection("backup")}>
            Backup & Export
          </button>
        </div>
        <div className="settings-nav-section">
          <div className="settings-nav-section-label">App</div>
          <button type="button" className={cn("settings-nav-item", section === "appearance" && "active")} onClick={() => setSection("appearance")}>
            Appearance
          </button>
          <button type="button" className={cn("settings-nav-item", section === "about" && "active")} onClick={() => setSection("about")}>
            About
          </button>
        </div>
      </nav>

      <div className="settings-content">
        {section === "profile" ? <ProfileSection username={username} onLogout={() => signOutRedirect()} /> : null}
        {section === "taxonomy" ? <TaxonomySection /> : null}
        {section === "backup" ? <BackupSection /> : null}
        {section === "appearance" ? <AppearanceSection /> : null}
        {section === "about" ? <AboutSection /> : null}
      </div>
    </div>
  );
}

export default SettingsWorkspace;
