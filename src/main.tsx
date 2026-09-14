import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import {
  applyLanguageAttribute,
  applyThemeClass,
  initializeSettings,
  useSettingsStore,
} from "@/stores/settings-store";

initializeSettings();
const initialSettings = useSettingsStore.getState();
applyThemeClass(initialSettings.resolvedTheme);
applyLanguageAttribute(initialSettings.resolvedLanguage);
document.addEventListener(
  "contextmenu",
  (event) => {
    event.preventDefault();
  },
  { capture: true }
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
