import { useEffect, useRef, useState } from "react";
import { FaGoogle } from "react-icons/fa6";
import { loadGoogleScript } from "../utils/googleIdentity";

export interface GoogleAuthSectionProps {
  /** Called with the Google ID token after the user picks a Google account. */
  onCredential?: (credential: string) => void | Promise<void>;
  /** true while a login request is running (blocks a second click). */
  disabled?: boolean;
}

/**
 * Shared "OR" divider + "Continue with Google" button for the Login and Register pages.
 *
 * Your own button stays exactly as designed. Google's official (invisible) button is laid
 * on top of it, so a click opens Google's real sign-in popup. Google then hands us an ID
 * token, which the backend verifies. Without VITE_GOOGLE_CLIENT_ID the button explains
 * what is missing instead of pretending to work.
 */
const GoogleAuthSection = ({ onCredential, disabled = false }: GoogleAuthSectionProps) => {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef(onCredential);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    handlerRef.current = onCredential;
  });

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const overlay = overlayRef.current;
        if (cancelled || !overlay || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) void handlerRef.current?.(response.credential);
          },
        });
        overlay.innerHTML = "";
        window.google.accounts.id.renderButton(overlay, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: Math.round(Math.min(400, Math.max(200, wrapRef.current?.offsetWidth ?? 320))),
        });
      })
      .catch(() => {
        if (!cancelled) setNote("Could not load Google Sign-In. Check your internet connection or ad blocker.");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3" role="separator" aria-label="or">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium text-gray-400 tracking-wide">OR</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div ref={wrapRef} className="group relative mt-5 h-10">
        <button
          type="button"
          onClick={clientId ? undefined : () => setNote("Google Sign-In is not configured yet. Add VITE_GOOGLE_CLIENT_ID to frontend/.env and restart the app.")}
          tabIndex={clientId ? -1 : 0}
          aria-hidden={clientId ? true : undefined}
          className={`w-full h-10 flex items-center justify-center gap-2.5 border border-gray-300 group-hover:bg-gray-50 text-black font-semibold text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
            disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <FaGoogle className="text-base" aria-hidden="true" />
          Continue with Google
        </button>

        {clientId && (
          <div
            ref={overlayRef}
            className={`absolute inset-0 overflow-hidden opacity-0 ${disabled ? "pointer-events-none" : ""}`}
          />
        )}
      </div>

      {note && (
        <p role="status" className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-3">
          {note}
        </p>
      )}
    </div>
  );
};

export default GoogleAuthSection;
