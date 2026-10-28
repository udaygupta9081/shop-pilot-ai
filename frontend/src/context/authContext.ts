import { createContext, useContext } from "react";
import type { AuthUser, RegisterInput } from "../api/auth";

export interface AuthState {
  /** The logged-in user, or null. */
  user: AuthUser | null;
  /** true only while the app is asking the server "am I logged in?" at start-up. */
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

/** Use inside any component: const { user, login, logout } = useAuth(); */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
