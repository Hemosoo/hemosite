import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./compare.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Compare from "./Compare";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Compare />
  </StrictMode>
);
