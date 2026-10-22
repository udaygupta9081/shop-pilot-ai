import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, googleSignIn, loginUser, logoutUser, registerUser, type AuthUser } from "../api/auth";
import { AuthContext, type AuthState } from "./authContext";

/**
 * Keeps "who is logged in" in one place for the whole app.
 * The login itself lives in an HttpOnly cookie the browser sends automatically, so
 * nothing secret is stored in localStorage. On start-up we ask GET /api/auth/me,
 * which is what keeps you signed in after a page refresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getMe(controller.signal)
      .then(setUser)
      .catch(() => {
        /* offline or server down: treat as logged out */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const login = useCallback<AuthState["login"]>(async (email, password, rememberMe) => {
    setUser(await loginUser(email, password, rememberMe));
  }, []);

  const register = useCallback<AuthState["register"]>(async (input) => {
    setUser(await registerUser(input));
  }, []);

  const loginWithGoogle = useCallback<AuthState["loginWithGoogle"]>(async (credential) => {
    setUser(await googleSignIn(credential));
  }, []);

  const logout = useCallback<AuthState["logout"]>(async () => {
    await logoutUser(); // wait for the server to confirm before changing the UI
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, logout }),
    [user, loading, login, register, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
