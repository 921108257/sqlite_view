import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import {
  applyThemeClass,
  initializeSettings,
  useSettingsStore,
} from "@/stores/settings-store";

initializeSettings();
applyThemeClass(useSettingsStore.getState().resolvedTheme);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
