import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import TextField from "../components/TextField";
import PasswordField from "../components/PasswordField";
import GoogleAuthSection from "../components/GoogleAuthSection";
import { ApiError } from "../api/client";
import { useAuth } from "../context/authContext";
import {
  validateRegisterForm,
  isFormValid,
  type FormErrors,
} from "../utils/authValidation";

/**
 * Registration page. Validates the form, then calls the backend
 * (POST /api/auth/register) through the AuthContext. The new user is signed in
 * automatically and the app redirects away from this page (see GuestOnlyRoute).
 */
const Register = () => {
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // ignore double clicks while a request is running

    const validationErrors = validateRegisterForm({
      name,
      email,
      password,
      confirmPassword,
      acceptedTerms,
    });
    setErrors(validationErrors);
    setFormError(null);
    if (!isFormValid(validationErrors)) return;

    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, confirmPassword });
    } catch (err) {
      showError(err);
    }
  };

  return (
    <AuthLayout
      heading="Create your account"
      subheading="Join ShopPilot AI to get personalized picks"
      footerText="Already have an account?"
      footerLinkText="Login now"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          id="register-name"
          label="Name"
          value={name}
          onChange={(value) => {
            setName(value);
          }}
          placeholder="Enter your name"
          error={errors.name}
          autoComplete="name"
        />

        <TextField
          id="register-email"
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
          id="register-password"
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
          }}
          placeholder="Create a password"
          error={errors.password}
          autoComplete="new-password"
        />

        <PasswordField
          id="register-confirm-password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
          }}
          placeholder="Confirm your password"
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <div className="mb-5">
          <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
              }}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-black cursor-pointer shrink-0"
            />
            <span>
              I accept all{" "}
              <span className="text-blue-600 font-semibold">
                terms &amp; conditions
              </span>
            </span>
          </label>
          {errors.acceptedTerms && (
            <p role="alert" className="text-xs text-red-600 mt-1.5">
              {errors.acceptedTerms}
            </p>
          )}
        </div>

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
          {submitting ? "Creating account…" : "Register Now"}
        </button>
      </form>

      <GoogleAuthSection onCredential={handleGoogle} disabled={submitting} />
    </AuthLayout>
  );
};

export default Register;
