import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/saucer.css";
import { AuthProvider } from "react-oidc-context";
import { buildOidcAuthConfig } from "./features/auth/oidc";

const cognitoAuthConfig = buildOidcAuthConfig();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
