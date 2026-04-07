type StatusTone = "info" | "success" | "error";

type StatusBarProps = {
  message: string;
  tone: StatusTone;
  expanded: boolean;
};

function StatusBar({ message, tone, expanded }: StatusBarProps) {
  return (
    <div
      className={`status-bar status-bar-${tone}${expanded ? " status-bar-expanded" : ""}`}
      role="status"
      aria-live="polite"
      data-testid="status-bar"
    >
      <span className="status-bar-label">Status</span>
      <span className="status-bar-message">{message}</span>
    </div>
  );
}

export default StatusBar;
