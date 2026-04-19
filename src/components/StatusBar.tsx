import { useStatusViewModel } from "../features/status/useStatusViewModel";

function StatusBar() {
  const { statusMessage, statusTone, statusExpanded } = useStatusViewModel();

  return (
    <div
      className={`status-bar status-bar-${statusTone}${statusExpanded ? " status-bar-expanded" : ""}`}
      role="status"
      aria-live="polite"
      data-testid="status-bar"
    >
      <span className="status-bar-label">Status</span>
      <span className="status-bar-message">{statusMessage}</span>
    </div>
  );
}

export default StatusBar;
