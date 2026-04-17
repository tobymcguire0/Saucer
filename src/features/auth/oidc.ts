import type { AuthProviderProps } from "react-oidc-context";

import {
  clearOidcSessionState,
  getBrowserOrigin,
  replaceBrowserHistoryPath,
  redirectBrowserTo,
  type AuthBrowser,
} from "./browser";

type AuthEnvironmentSource = {
  VITE_COGNITO_REGION?: string;
  VITE_COGNITO_USER_POOL_ID?: string;
  VITE_COGNITO_CLIENT_ID?: string;
  VITE_COGNITO_DOMAIN?: string;
};

type AuthEnvironment = {
  cognitoRegion: string;
  userPoolId: string;
  clientId: string;
  cognitoDomain: string;
};

function getDefaultAuthEnvironmentSource(): AuthEnvironmentSource {
  return import.meta.env as AuthEnvironmentSource;
}

function requireAuthValue(value: string | undefined, key: keyof AuthEnvironmentSource) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing ${key} auth configuration.`);
  }

  return trimmed;
}

function normalizeCognitoDomain(domain: string) {
  const trimmed = domain.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function readAuthEnvironment(
  env: AuthEnvironmentSource = getDefaultAuthEnvironmentSource(),
): AuthEnvironment {
  return {
    cognitoRegion: requireAuthValue(env.VITE_COGNITO_REGION, "VITE_COGNITO_REGION"),
    userPoolId: requireAuthValue(env.VITE_COGNITO_USER_POOL_ID, "VITE_COGNITO_USER_POOL_ID"),
    clientId: requireAuthValue(env.VITE_COGNITO_CLIENT_ID, "VITE_COGNITO_CLIENT_ID"),
    cognitoDomain: normalizeCognitoDomain(
      requireAuthValue(env.VITE_COGNITO_DOMAIN, "VITE_COGNITO_DOMAIN"),
    ),
  };
}

export function buildOidcAuthority(env: AuthEnvironmentSource = getDefaultAuthEnvironmentSource()) {
  const { cognitoRegion, userPoolId } = readAuthEnvironment(env);
  return `https://cognito-idp.${cognitoRegion}.amazonaws.com/${userPoolId}`;
}

export function buildOidcAuthConfig(
  env: AuthEnvironmentSource = getDefaultAuthEnvironmentSource(),
  browser?: AuthBrowser,
): AuthProviderProps {
  const { clientId } = readAuthEnvironment(env);

  return {
    authority: buildOidcAuthority(env),
    client_id: clientId,
    redirect_uri: getBrowserOrigin(browser),
    response_type: "code",
    scope: "email openid phone",
    onSigninCallback: () => {
      replaceBrowserHistoryPath(browser);
    },
  };
}

export function hasAuthCallbackParams(search: string) {
  const params = new URLSearchParams(search);
  return params.has("code") || params.has("state") || params.has("error");
}

export function buildHostedLogoutUrl(
  env: AuthEnvironmentSource = getDefaultAuthEnvironmentSource(),
  browser?: AuthBrowser,
) {
  const { clientId, cognitoDomain } = readAuthEnvironment(env);
  const returnTo = getBrowserOrigin(browser);
  return `${cognitoDomain}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(returnTo)}`;
}

export function signOutRedirect(
  browser?: AuthBrowser,
  env: AuthEnvironmentSource = getDefaultAuthEnvironmentSource(),
) {
  clearOidcSessionState(browser);
  redirectBrowserTo(buildHostedLogoutUrl(env, browser), browser);
}
