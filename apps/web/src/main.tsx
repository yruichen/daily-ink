import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import "./i18n";
import { App } from "./app/App";
import "./styles/foundation.css";
import "./styles/shell.css";
import "./styles/common.css";
import "./styles/journal.css";
import "./styles/wordbooks.css";
import "./styles/vocabulary.css";
import "./styles/review.css";
import "./styles/learning.css";
import "./styles/settings.css";
import "./styles/responsive.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
