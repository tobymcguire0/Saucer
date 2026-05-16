function AboutSection() {
  return (
    <div>
      <h2 className="settings-section-title">About</h2>
      <div className="settings-group">
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Saucer</div>
            <div className="settings-row-desc">A local-first recipe library. Version 0.1.0.</div>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Check for updates</div>
            <div className="settings-row-desc">Confirm you're running the latest release.</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm">Check now</button>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Keyboard shortcuts</div>
            <div className="settings-row-desc">See all available shortcuts.</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm">View</button>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Send feedback</div>
            <div className="settings-row-desc">Have a suggestion or bug to report?</div>
          </div>
          <a className="btn btn-secondary btn-sm" href="mailto:feedback@saucer.app">Send</a>
        </div>
      </div>
    </div>
  );
}

export default AboutSection;
