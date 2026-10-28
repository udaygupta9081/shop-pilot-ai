import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";

const Checking = () => (
  <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center text-sm text-gray-500" role="status">
    Checking your session…
  </div>
);

/** Only allow a same-site path (stops "open redirect" tricks such as //evil.com). */
const safePath = (value: unknown): string =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";

/**
 * Wrap a page that needs a logged-in user:
 *   <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
 * Visitors who are not logged in are sent to /login and brought back afterwards.
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Checking />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

/** Login/Register pages: someone who is already logged in is sent away from them. */
export function GuestOnlyRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Checking />;
  if (user) return <Navigate to={safePath((location.state as { from?: string } | null)?.from)} replace />;
  return children;
}
