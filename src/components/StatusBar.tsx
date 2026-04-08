import { useStatusContext } from "../context/status-context";

function StatusBar() {
  const { statusMessage, statusTone, statusExpanded } = useStatusContext();

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
