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

const cognitoAuthConfig = {
  authority: `https://cognito-idp.${import.meta.env.VITE_COGNITO_REGION}.amazonaws.com/${import.meta.env.VITE_COGNITO_USER_POOL_ID}`,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
  redirect_uri: window.location.origin,
  response_type: "code",
  scope: "phone openid email",
};
  
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
