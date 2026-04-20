import { useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";

import { ApiClient } from "../../lib/apiClient";
import { useSyncStore } from "./useSyncStore";

export function useSyncEffect() {
  const auth = useAuth();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = auth.user?.access_token ?? null;
  }, [auth.user?.access_token]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const client = new ApiClient(() => tokenRef.current);
    useSyncStore.getState().setClient(client);

    // Try to bootstrap / connect every 5 seconds until we connect and are bootstrapped
    let id: ReturnType<typeof setInterval>;
    const bootstrap = () => {
      if (useSyncStore.getState().connected) {
        clearInterval(id);
        return;
      }
      void useSyncStore.getState().bootstrap();
    };
    bootstrap(); // try immediately, don't wait 5s first
    id = setInterval(bootstrap, 5_000);
    return () => clearInterval(id);
    
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const pull = () => void useSyncStore.getState().pullChanges();
    const id = setInterval(pull, 10_000);
    window.addEventListener("focus", pull);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", pull);
    };
  }, [auth.isAuthenticated]);
}
