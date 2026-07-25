import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { AppShell } from "../components/layout/AppShell";
import { VocabularyCapture } from "../features/vocabulary/VocabularyCapture";

const JournalPage = lazy(() =>
  import("../pages/JournalPage").then((module) => ({
    default: module.JournalPage,
  })),
);
const VocabularyPage = lazy(() =>
  import("../pages/VocabularyPage").then((module) => ({
    default: module.VocabularyPage,
  })),
);
const ReviewPage = lazy(() =>
  import("../pages/ReviewPage").then((module) => ({
    default: module.ReviewPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

export const App = () => (
  <>
    <Suspense fallback={<div className="app-loading" aria-label="Loading" />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<JournalPage />} />
          <Route path="vocabulary" element={<VocabularyPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
    <VocabularyCapture />
  </>
);
