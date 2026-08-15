import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { NewInitiativePage } from "@/pages/NewInitiativePage";

// Route-level code splitting: Recharts and TanStack Table are the two
// heaviest dependencies in the bundle, and both are scoped to a single
// route each — no reason to ship them on the login screen's first paint.
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const InitiativesPage = lazy(() =>
  import("@/pages/InitiativesPage").then((m) => ({ default: m.InitiativesPage })),
);

function RouteFallback() {
  return <p className="p-8 text-sm text-white/70">Загрузка…</p>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* No auth gate here on purpose — a demo/portfolio link has to open
          directly. Viewing is public end to end (see routers/*.py); only
          the mutating actions (create/score/delete) require login, and
          the backend enforces that regardless of what the UI shows. */}
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/initiatives"
          element={
            <Suspense fallback={<RouteFallback />}>
              <InitiativesPage />
            </Suspense>
          }
        />
        <Route path="/initiatives/new" element={<NewInitiativePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
