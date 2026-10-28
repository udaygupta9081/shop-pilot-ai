const DEFAULT_BASE = "http://localhost:4000/api";

export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_BASE
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  /** Per-field messages from the server, e.g. { email: "Enter a valid email address." } */
  fields: Record<string, string>;
  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

interface ErrorBody {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Turns a failed response into an ApiError using the server's JSON message when there is one. */
async function toApiError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  let fields: Record<string, string> = {};
  try {
    const body = (await res.json()) as ErrorBody;
    if (body.error) message = body.error;
    if (body.fieldErrors) fields = body.fieldErrors;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(message, res.status, fields);
}

type Params = Record<string, string | number | boolean | null | undefined>;

/** Centralised GET helper: builds the URL, supports cancellation, normalises errors. */
export async function apiGet<T>(
  path: string,
  params?: Params,
  signal?: AbortSignal,
  withCredentials = false, // true = send the login cookie (needed for /auth/me)
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      signal,
      credentials: withCredentials ? "include" : "same-origin",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Could not reach the server. Is the API running?", 0);
  }

  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

/** POST/PUT/DELETE with a JSON body. Always sends the login cookie. */
export async function apiSend<T>(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Could not reach the server. Is the API running?", 0);
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

export const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === "AbortError";