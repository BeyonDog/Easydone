import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyThemeCssVarsToDocument, DEFAULT_THEME_ACCENT_HEX, DEFAULT_THEME_BACKGROUND_HEX } from "./lib/themeAccent";
import { applyWallpaperCssVarsToDocument } from "./lib/wallpaper";
import { initWindowCloseHandler } from "./lib/windowClose";
import "./App.css";

applyThemeCssVarsToDocument(DEFAULT_THEME_ACCENT_HEX, DEFAULT_THEME_BACKGROUND_HEX);
applyWallpaperCssVarsToDocument(null, 0);

initWindowCloseHandler();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
