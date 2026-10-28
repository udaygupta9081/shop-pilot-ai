import { ApiError, apiGet, apiSend } from "./client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  authProviders: string[];
  createdAt?: string;
}

interface UserResponse {
  user: AuthUser;
  message?: string;
}

/** Who is logged in right now? Returns null when nobody is (the server answers 401). */
export async function getMe(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    const res = await apiGet<UserResponse>("/auth/me", undefined, signal, true);
    return res.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const registerUser = (input: RegisterInput) =>
  apiSend<UserResponse>("POST", "/auth/register", input).then((r) => r.user);

export const loginUser = (email: string, password: string, rememberMe: boolean) =>
  apiSend<UserResponse>("POST", "/auth/login", { email, password, rememberMe }).then((r) => r.user);

/** `credential` is the Google ID token. The server verifies it with Google. */
export const googleSignIn = (credential: string) =>
  apiSend<UserResponse>("POST", "/auth/google", { credential }).then((r) => r.user);

export const logoutUser = () => apiSend<{ message: string }>("POST", "/auth/logout");
