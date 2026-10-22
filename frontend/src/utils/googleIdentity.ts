// Loads Google's official sign-in script (Google Identity Services) once.

interface GoogleIdApi {
  initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let loading: Promise<void> | null = null;

export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loading = null; // allow a retry later
        script.remove();
        reject(new Error("Google script failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}
