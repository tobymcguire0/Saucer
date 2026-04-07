import { useCallback, useEffect, useRef, useState } from "react";

type StatusTone = "info" | "success" | "error";

export function useStatusMessage(initialMessage: string, collapseDelayMs = 5000) {
  const [statusMessage, setStatusMessage] = useState(initialMessage);
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [statusExpanded, setStatusExpanded] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateStatus = useCallback(
    (message: string, tone: StatusTone = "info") => {
      setStatusMessage(message);
      setStatusTone(tone);
      setStatusExpanded(true);

      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }

      collapseTimerRef.current = setTimeout(() => {
        setStatusExpanded(false);
      }, collapseDelayMs);
    },
    [collapseDelayMs],
  );

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  return {
    statusMessage,
    statusTone,
    statusExpanded,
    updateStatus,
  };
}

export type { StatusTone };
