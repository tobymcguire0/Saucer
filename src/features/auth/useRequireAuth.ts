import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

import { getBrowserSearch, type AuthBrowser } from "./browser";
import { hasAuthCallbackParams } from "./oidc";

type AuthRedirectState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  activeNavigator?: string;
  error?: unknown;
  search: string;
};

export function shouldStartSignIn({
  isAuthenticated,
  isLoading,
  activeNavigator,
  error,
  search,
}: AuthRedirectState) {
  return (
    !isAuthenticated &&
    !isLoading &&
    !activeNavigator &&
    !error &&
    !hasAuthCallbackParams(search)
  );
}

export function useRequireAuth(browser?: AuthBrowser) {
  const auth = useAuth();
  const search = getBrowserSearch(browser);

  useEffect(() => {
    if (
      shouldStartSignIn({
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        activeNavigator: auth.activeNavigator,
        error: auth.error,
        search,
      })
    ) {
      void auth.signinRedirect();
    }
  }, [auth.activeNavigator, auth.error, auth.isAuthenticated, auth.isLoading, auth.signinRedirect, search]);

  return auth;
}
