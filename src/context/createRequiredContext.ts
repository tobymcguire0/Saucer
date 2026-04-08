import { createContext, useContext } from "react";

export function createRequiredContext<T>(name: string) {
  const Context = createContext<T | undefined>(undefined);

  function useRequiredContext() {
    const value = useContext(Context);

    if (!value) {
      throw new Error(`${name} must be used within AppProvider.`);
    }

    return value;
  }

  return [Context, useRequiredContext] as const;
}
