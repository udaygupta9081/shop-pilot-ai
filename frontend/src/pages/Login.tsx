import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import TextField from "../components/TextField";
import PasswordField from "../components/PasswordField";
import GoogleAuthSection from "../components/GoogleAuthSection";
import { ApiError } from "../api/client";
import { useAuth } from "../context/authContext";
import {
  validateLoginForm,
  isFormValid,
  type FormErrors,
} from "../utils/authValidation";

/**
 * Login page. Validates the form, then calls the backend (POST /api/auth/login)
 * through the AuthContext. After a successful login the app redirects away
 * from this page (see GuestOnlyRoute in App.tsx).
 */
const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showForgotNote, setShowForgotNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Turns a failed request into messages on the page.
  const showError = (err: unknown) => {
    if (err instanceof ApiError) {
      setErrors(err.fields);
      setFormError(Object.keys(err.fields).length ? null : err.message);
    } else {
      setFormError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // ignore double clicks while a request is running

    const validationErrors = validateLoginForm({ email, password });
    setErrors(validationErrors);
    setFormError(null);
    if (!isFormValid(validationErrors)) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password, rememberMe);
    } catch (err) {
      showError(err);
    }
  };

  const handleGoogle = async (credential: string) => {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      showError(err);
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
            Password reset isn't available yet.
          </p>
        )}

        {formError && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5"
          >
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="w-full bg-black hover:bg-neutral-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Logging in…" : "Login Now"}
        </button>
      </form>

      <GoogleAuthSection onCredential={handleGoogle} disabled={submitting} />
    </AuthLayout>
  );
};

export default Login;
