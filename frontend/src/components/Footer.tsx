import { Link } from "react-router-dom";
import {
  FaApple,
  FaGooglePlay,
  FaInstagram,
  FaXTwitter,
  FaLinkedinIn,
} from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className="w-full bg-[#f9f9f9] border-t border-gray-200/80 text-left text-gray-800">
      <div className="w-[80%] mx-auto pt-14 pb-8">
        {/* Main 3-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12">
          {/* Column 1: Brand Info & App Store Badges (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-start gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1 group">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-black">
                shop pilot <span className="text-emerald-500">AI</span>
              </span>
            </Link>

            {/* Tagline */}
            <p className="text-xs sm:text-[13px] text-gray-500 max-w-sm leading-relaxed">
              The top 1% of every category, re-ranked live by AI agents.
            </p>

            {/* Download Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* App Store Button */}
              <button
                type="button"
                className="bg-black hover:bg-neutral-800 text-white px-4 py-2.5 rounded-md flex items-center gap-2.5 transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
              >
                <FaApple className="text-base" />
                <span className="text-xs font-semibold tracking-wide">
                  App Store
                </span>
              </button>

              {/* Google Play Button */}
              <button
                type="button"
                className="bg-black hover:bg-neutral-800 text-white px-4 py-2.5 rounded-md flex items-center gap-2.5 transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
              >
                <FaGooglePlay className="text-xs" />
                <span className="text-xs font-semibold tracking-wide">
                  Google Play
                </span>
              </button>
            </div>
          </div>

          {/* Spacer column on large screens */}
          <div className="hidden md:block md:col-span-1" />

          {/* Column 2: Company Links (3 cols) */}
          <div className="md:col-span-3 flex flex-col items-start gap-3">
            <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-400">
              COMPANY
            </h4>
            <div className="flex flex-col items-start gap-2.5 pt-1">
              <Link
                to="/about"
                className="text-xs sm:text-[13px] font-bold text-gray-900 hover:text-emerald-600 transition-colors"
              >
                About us
              </Link>
              <Link
                to="/terms"
                className="text-xs sm:text-[13px] font-bold text-gray-900 hover:text-emerald-600 transition-colors"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                to="/privacy"
                className="text-xs sm:text-[13px] font-bold text-gray-900 hover:text-emerald-600 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Column 3: Contact Us (3 cols) */}
          <div className="md:col-span-3 flex flex-col items-start gap-3">
            <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-400">
              CONTACT US
            </h4>
            <div className="flex flex-col items-start gap-1 pt-1">
              <a
                href="mailto:support@shoppilot.ai"
                className="text-xs sm:text-[13px] font-bold text-gray-900 hover:text-emerald-600 transition-colors"
              >
                support@shoppilot.ai
              </a>
              <p className="text-xs text-gray-500 mt-1">
                Shop Pilot Pvt Ltd, Bengaluru
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide">
                CIN — U72900KA2022PTC157982
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            Copyright © 2026 Shop Pilot AI. All rights reserved
          </p>

          {/* Social Icons */}
          <div className="flex items-center gap-2">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-700 hover:text-black transition-colors shadow-xs"
            >
              <FaInstagram className="text-sm" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="X Twitter"
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-700 hover:text-black transition-colors shadow-xs"
            >
              <FaXTwitter className="text-xs" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-700 hover:text-black transition-colors shadow-xs"
            >
              <FaLinkedinIn className="text-xs" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
