import { useState } from "react";
import { FaGoogle } from "react-icons/fa6";

export interface GoogleAuthSectionProps {
  /**
   * Optional real sign-in handler, wired up later. When omitted (the
   * current default on both Login and Register), clicking the button
   * just shows a demo note — no OAuth popup, no redirect, nothing is
   * sent anywhere.
   */
  onGoogleSignIn?: () => void;
}

/**
 * Shared "OR" divider + "Continue with Google" button for the Login
 * and Registration pages. UI only — there is no Google OAuth wired up.
 * Kept as its own component (instead of duplicated markup) since both
 * pages need the exact same divider/button/demo-note combination.
 */
const GoogleAuthSection = ({ onGoogleSignIn }: GoogleAuthSectionProps) => {
  const [showDemoNote, setShowDemoNote] = useState(false);

  const handleClick = () => {
    if (onGoogleSignIn) {
      onGoogleSignIn();
      return;
    }
    setShowDemoNote(true);
  };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3" role="separator" aria-label="or">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium text-gray-400 tracking-wide">
          OR
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="w-full mt-5 flex items-center justify-center gap-2.5 border border-gray-300 hover:bg-gray-50 text-black font-semibold text-sm py-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        <FaGoogle className="text-base" aria-hidden="true" />
        Continue with Google
      </button>

      {showDemoNote && (
        <p
          role="status"
          className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-3"
        >
          Google Sign-In will be connected when authentication is
          implemented.
        </p>
      )}
    </div>
  );
};

export default GoogleAuthSection;
