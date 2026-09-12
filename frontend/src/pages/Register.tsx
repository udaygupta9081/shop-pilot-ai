import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import TextField from "../components/TextField";
import PasswordField from "../components/PasswordField";
import GoogleAuthSection from "../components/GoogleAuthSection";
import {
  validateRegisterForm,
  isFormValid,
  type FormErrors,
} from "../utils/authValidation";

/**
 * Registration page — FRONTEND ONLY.
 *
 * There is no backend authentication yet. Submitting a valid form just
 * shows a demo success message; nothing is sent anywhere, nothing is
 * persisted, and no account/session/token is created.
 */
const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateRegisterForm({
      name,
      email,
      password,
      confirmPassword,
      acceptedTerms,
    });
    setErrors(validationErrors);
    setSubmitted(false);

    if (isFormValid(validationErrors)) {
      setSubmitted(true);
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
            setSubmitted(false);
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
            setSubmitted(false);
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
            setSubmitted(false);
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
            setSubmitted(false);
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
                setSubmitted(false);
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

        {submitted && (
          <div
            role="status"
            className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-5"
          >
            Registration form submitted successfully. Backend
            authentication will be connected later.
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-black hover:bg-neutral-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors cursor-pointer active:scale-[0.99]"
        >
          Register Now
        </button>
      </form>

      <GoogleAuthSection />
    </AuthLayout>
  );
};

export default Register;
