import { useEffect } from "react";
import { usePreferencesStore } from "./usePreferencesStore";

export function usePreferencesEffect() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const textSize = usePreferencesStore((state) => state.textSize);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (effective: "light" | "dark") => {
      root.dataset.theme = effective;
    };

    if (themeMode === "system") {
      const mq = typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
      apply(mq?.matches ? "dark" : "light");
      if (!mq) return;
      const listener = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
    apply(themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
  }, [textSize]);
}
