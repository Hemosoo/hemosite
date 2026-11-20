import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/jetbrains-mono";
// The site's theme (Tailwind and its tokens), which the poker table needs,
// and the Stretchtext styles the text view uses; then this version's own.
import "../../index.css";
import "../../styles/player.css";
import "./v3.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
