import { useShallow } from "zustand/react/shallow";

import { useStatusStore } from "./useStatusStore";

export function useStatusViewModel() {
  return useStatusStore(
    useShallow((state) => ({
      statusMessage: state.statusMessage,
      statusTone: state.statusTone,
      statusExpanded: state.statusExpanded,
      updateStatus: state.updateStatus,
    })),
  );
}
