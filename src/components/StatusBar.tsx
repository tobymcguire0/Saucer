import { cn } from "../lib/cn";
import { useSyncStore } from "../features/sync/useSyncStore";
import { useStatusViewModel } from "../features/status/useStatusViewModel";

function StatusBar() {
  const { statusMessage, statusTone, statusExpanded } = useStatusViewModel();
  const connected = useSyncStore((s) => s.connected);
  const toneClass =
    statusTone === "success"
      ? "border-panel-60 bg-panel-70 text-background-0"
      : statusTone === "error"
        ? "border-accent-60 bg-accent-70 text-background-0"
        : "border-primary-20 bg-background-30 text-text-60";

  return (
    <div
      className={cn(
        "group fixed bottom-4 right-6 z-40 flex max-w-[calc(100vw-3rem)] items-center overflow-hidden rounded-full border px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur-md transition-[max-width] duration-300 max-sm:bottom-3 max-sm:left-3 max-sm:max-w-[calc(100vw-1.5rem)]",
        toneClass,
      )}
      role="status"
      aria-live="polite"
      data-testid="status-bar"
    >
      <span className="text-xs font-bold uppercase tracking-[0.24em]">Status</span>
      <span
        className={cn(
          "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,padding-left] duration-300",
          "group-hover:max-w-[60rem] group-hover:pl-3 group-hover:opacity-100",
          statusExpanded && "max-w-[60rem] pl-3 opacity-100",
        )}
      >
        {statusMessage}
      </span>
      <span className="ml-3 flex items-center gap-2 border-l border-current/15 pl-3 text-xs font-medium">
        <span className={cn("h-2.5 w-2.5 rounded-full", connected ? "bg-primary-15" : "bg-accent-10")} />
        {connected ? "Connected to server" : "Not connected to server"}
      </span>
    </div>
  );
}

export default StatusBar;
