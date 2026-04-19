import { create } from "zustand";

export type StatusTone = "info" | "success" | "error";

function createInitialState() {
  return {
    statusMessage: "Loading Saucer...",
    statusTone: "info" as StatusTone,
    statusExpanded: false,
  };
}

let collapseTimer: ReturnType<typeof setTimeout> | null = null;

type StatusStoreState = ReturnType<typeof createInitialState> & {
  updateStatus: (message: string, tone?: StatusTone) => void;
  reset: () => void;
};

export const useStatusStore = create<StatusStoreState>((set) => ({
  ...createInitialState(),
  updateStatus: (message, tone = "info") => {
    if (collapseTimer) {
      clearTimeout(collapseTimer);
    }

    set({
      statusMessage: message,
      statusTone: tone,
      statusExpanded: true,
    });

    collapseTimer = setTimeout(() => {
      set({ statusExpanded: false });
    }, 5000);
  },
  reset: () => {
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
    set(createInitialState());
  },
}));

export function resetStatusStore() {
  useStatusStore.getState().reset();
}
