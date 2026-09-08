import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Intercept fetch to track server load
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      const loadHeader = response.headers.get("X-Server-Load");
      if (loadHeader) {
        const load = parseFloat(loadHeader);
        if (!isNaN(load)) {
          window.dispatchEvent(new CustomEvent("server-load", { detail: load }));
        }
      }
      return response;
    } catch (error) {
      throw error;
    }
  };
}

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
