import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/app-shell.css";
import "./styles/browse-view.css";
import "./styles/upload-modal.css";
import "./styles/taxonomy-view.css";
import "./styles/recipe-detail-view.css";
import "./styles/rating-stars.css";
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
