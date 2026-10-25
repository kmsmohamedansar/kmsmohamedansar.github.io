import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BB8Experience from "./BB8Experience";
import "./bb8.css";

createRoot(document.getElementById("bb8-root")).render(
  <StrictMode>
    <BB8Experience />
  </StrictMode>,
);
