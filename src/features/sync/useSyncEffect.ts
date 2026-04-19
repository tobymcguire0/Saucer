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
    void useSyncStore.getState().bootstrap();
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const pull = () => void useSyncStore.getState().pullChanges();
    const id = setInterval(pull, 30_000);
    window.addEventListener("focus", pull);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", pull);
    };
  }, [auth.isAuthenticated]);
}
