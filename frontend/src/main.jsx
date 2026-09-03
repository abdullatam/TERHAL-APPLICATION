import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import { OnboardingProvider } from "./state/OnboardingContext.jsx";
import { TripProvider } from "./state/TripContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <OnboardingProvider>
          <TripProvider>
            {/* Toasts sit inside the phone frame, so the provider wraps App. */}
            <ToastProvider>
              <App />
            </ToastProvider>
          </TripProvider>
        </OnboardingProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
