import { describe, expect, it, vi } from "vitest";

import type { AuthBrowser } from "../src/features/auth/browser";
import {
  buildHostedLogoutUrl,
  buildOidcAuthConfig,
  hasAuthCallbackParams,
  signOutRedirect,
} from "../src/features/auth/oidc";
import { shouldStartSignIn } from "../src/features/auth/useRequireAuth";
import { normalizeWebsiteImportUrl } from "../src/features/editor/recipeImportService";

const authEnv = {
  VITE_COGNITO_REGION: "us-east-1",
  VITE_COGNITO_USER_POOL_ID: "pool-id",
  VITE_COGNITO_CLIENT_ID: "client-id",
  VITE_COGNITO_DOMAIN: "cookbook.auth.us-east-1.amazoncognito.com/",
};

function createBrowser(search = "") {
  let keys = ["oidc.user:saucer", "app:theme", "oidc.access_token"];
  const removed: string[] = [];
  const assign = vi.fn();
  const replaceState = vi.fn();

  const sessionStorage: AuthBrowser["sessionStorage"] = {
    get length() {
      return keys.length;
    },
    key(index) {
      return keys[index] ?? null;
    },
    removeItem(key) {
      removed.push(key);
      keys = keys.filter((entry) => entry !== key);
    },
  };

  const browser: AuthBrowser = {
    location: {
      origin: "https://saucer.test",
      pathname: "/auth/callback",
      search,
      assign,
    },
    history: {
      replaceState,
    },
    sessionStorage,
    document: {
      title: "Saucer",
    },
  };

  return {
    browser,
    assign,
    replaceState,
    removed,
    getKeys: () => keys,
  };
}

describe("auth boundaries", () => {
  it("builds OIDC config and strips callback params after sign-in", () => {
    const { browser, replaceState } = createBrowser("?code=abc&state=123");
    const config = buildOidcAuthConfig(authEnv, browser);

    expect(config.authority).toBe("https://cognito-idp.us-east-1.amazonaws.com/pool-id");
    expect(config.client_id).toBe("client-id");
    expect(config.redirect_uri).toBe("https://saucer.test");

    config.onSigninCallback?.(undefined);

    expect(replaceState).toHaveBeenCalledWith({}, "Saucer", "/auth/callback");
  });

  it("clears OIDC session state before redirecting to Cognito logout", () => {
    const { browser, assign, removed, getKeys } = createBrowser();
    const logoutUrl = buildHostedLogoutUrl(authEnv, browser);

    expect(logoutUrl).toBe(
      "https://cookbook.auth.us-east-1.amazoncognito.com/logout?client_id=client-id&logout_uri=https%3A%2F%2Fsaucer.test",
    );

    signOutRedirect(browser, authEnv);

    expect(removed).toEqual(["oidc.user:saucer", "oidc.access_token"]);
    expect(getKeys()).toEqual(["app:theme"]);
    expect(assign).toHaveBeenCalledWith(logoutUrl);
  });

  it("detects callback params and auth redirect readiness", () => {
    expect(hasAuthCallbackParams("?code=abc&state=123")).toBe(true);
    expect(hasAuthCallbackParams("?error=access_denied")).toBe(true);
    expect(hasAuthCallbackParams("?tab=recipes")).toBe(false);

    expect(
      shouldStartSignIn({
        isAuthenticated: false,
        isLoading: false,
        activeNavigator: undefined,
        error: undefined,
        search: "",
      }),
    ).toBe(true);

    expect(
      shouldStartSignIn({
        isAuthenticated: false,
        isLoading: false,
        activeNavigator: undefined,
        error: undefined,
        search: "?code=abc",
      }),
    ).toBe(false);
  });
});

describe("recipe import boundaries", () => {
  it("normalizes and validates website URLs", () => {
    expect(normalizeWebsiteImportUrl(" https://example.com/recipes/pasta ")).toBe(
      "https://example.com/recipes/pasta",
    );
    expect(() => normalizeWebsiteImportUrl("not a url")).toThrow(
      "Enter a valid http(s) URL before importing.",
    );
    expect(() => normalizeWebsiteImportUrl("ftp://example.com/recipe")).toThrow(
      "Only http(s) recipe URLs are supported.",
    );
  });
});
