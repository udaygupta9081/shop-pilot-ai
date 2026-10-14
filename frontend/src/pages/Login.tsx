import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import TextField from "../components/TextField";
import PasswordField from "../components/PasswordField";
import GoogleAuthSection from "../components/GoogleAuthSection";
import {
  validateLoginForm,
  isFormValid,
  type FormErrors,
} from "../utils/authValidation";

/**
 * Login page — FRONTEND ONLY.
 *
 * There is no backend authentication yet. Submitting a valid form just
 * shows a demo success message; nothing is sent anywhere, nothing is
 * persisted, and no session/token is created.
 */
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showForgotNote, setShowForgotNote] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateLoginForm({ email, password });
    setErrors(validationErrors);
    setSubmitted(false);

    if (isFormValid(validationErrors)) {
      setSubmitted(true);
    }
  };

  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Log in to continue to ShopPilot AI"
      footerText="Don't have an account?"
      footerLinkText="Register now"
      footerLinkTo="/register"
    >
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setSubmitted(false);
          }}
          placeholder="Enter your email"
          error={errors.email}
          autoComplete="email"
        />

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setSubmitted(false);
          }}
          placeholder="Enter your password"
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between mb-5">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setShowForgotNote((v) => !v)}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {showForgotNote && (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-5">
            Password reset isn't available yet — it will be added once
            backend authentication is connected.
          </p>
        )}

        {submitted && (
          <div
            role="status"
            className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-5"
          >
            Login form submitted successfully. Backend authentication will
            be connected later.
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-black hover:bg-neutral-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors cursor-pointer active:scale-[0.99]"
        >
          Login Now
        </button>
      </form>

      <GoogleAuthSection />
    </AuthLayout>
  );
};

export default Login;
