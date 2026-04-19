import { useSyncStore } from "../features/sync/useSyncStore";
import { useStatusViewModel } from "../features/status/useStatusViewModel";

function StatusBar() {
  const { statusMessage, statusTone, statusExpanded } = useStatusViewModel();
  const connected = useSyncStore((s) => s.connected);

  return (
    <div
      className={`status-bar status-bar-${statusTone}${statusExpanded ? " status-bar-expanded" : ""}`}
      role="status"
      aria-live="polite"
      data-testid="status-bar"
    >
      <span className="status-bar-label">Status</span>
      <span className="status-bar-message">{statusMessage}</span>
      <span className={`status-bar-connection status-bar-connection-${connected ? "ok" : "error"}`}>
        {connected ? "Connected to server" : "Not connected to server"}
      </span>
    </div>
  );
}

export default StatusBar;
