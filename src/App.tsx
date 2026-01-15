import { PageLoading } from "@/components/LoadingSpinner";
import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

// Lazy load page components
const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({
    default: module.HomePage,
  }))
);
const PrivacyPolicy = lazy(() =>
  import("./pages/PrivacyPolicy").then((module) => ({
    default: module.PrivacyPolicy,
  }))
);
const TermsOfService = lazy(() =>
  import("./pages/TermsOfService").then((module) => ({
    default: module.TermsOfService,
  }))
);

const App = () => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </Suspense>
  );
};

export default App;
