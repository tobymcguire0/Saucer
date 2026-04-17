import { useShallow } from "zustand/react/shallow";

import { useStatusStore, type StatusTone } from "../features/status/useStatusStore";

export type { StatusTone };

export type StatusContextValue = {
  statusMessage: string;
  statusTone: StatusTone;
  statusExpanded: boolean;
  updateStatus: (message: string, tone?: StatusTone) => void;
};

export function useStatusContext(): StatusContextValue {
  return useStatusStore(
    useShallow((state) => ({
      statusMessage: state.statusMessage,
      statusTone: state.statusTone,
      statusExpanded: state.statusExpanded,
      updateStatus: state.updateStatus,
    })),
  );
}
