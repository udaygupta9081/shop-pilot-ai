import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface AuthLayoutProps {
  heading: string;
  subheading?: string;
  children: ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkTo: string;
}

/**
 * Shared two-panel layout for the Login and Registration pages: a dark
 * brand panel (reusing the Navbar's #111111 background and the
 * Footer's "shop pilot AI" wordmark styling) on desktop, and the actual
 * form card on the other side. Collapses to a single column on mobile.
 */
const AuthLayout = ({
  heading,
  subheading,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) => {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white flex flex-col md:flex-row pb-10 sm:pb-14 md:pb-16">
      {/* Brand panel — hidden on small screens to keep the form front and center */}
      <div className="hidden md:flex md:w-1/2 bg-[#111111] text-white flex-col justify-between p-10 lg:p-14">
        <div>
          <span className="text-2xl font-black tracking-tight">
            shop pilot <span className="text-emerald-500">AI</span>
          </span>
          <p className="text-sm text-gray-400 mt-4 max-w-sm leading-relaxed">
            The top 1% of every category, re-ranked live by AI agents — so
            you buy right the first time.
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Copyright © 2026 Shop Pilot AI. All rights reserved
        </p>
      </div>

      {/* Form panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-black mb-1">{heading}</h1>
          {subheading && (
            <p className="text-sm text-gray-500 mb-6">{subheading}</p>
          )}
          {children}
          <p className="text-sm text-gray-500 mt-6 text-center">
            {footerText}{" "}
            <Link
              to={footerLinkTo}
              className="text-blue-600 font-semibold hover:underline"
            >
              {footerLinkText}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
