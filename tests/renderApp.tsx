import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";

import { resetAppStores } from "../src/test-utils/resetAppStores";

const { authState } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: true,
    isLoading: false,
    activeNavigator: undefined,
    error: undefined,
    user: {
      profile: {
        preferred_username: "Test User",
      },
    },
    signinRedirect: vi.fn(),
  },
}));

vi.mock("react-oidc-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => authState,
}));

import App from "../src/App";

export function resetMockAuth() {
  authState.isAuthenticated = true;
  authState.isLoading = false;
  authState.activeNavigator = undefined;
  authState.error = undefined;
  authState.user = {
    profile: {
      preferred_username: "Test User",
    },
  };
  authState.signinRedirect.mockReset();
}

export function renderApp() {
  resetAppStores();
  return render(<App />);
}
