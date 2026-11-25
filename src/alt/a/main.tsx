import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/jetbrains-mono";
// The site's base styles and theme: the poker table is built on them.
import "../../index.css";
import "./a.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
