/**
 * Pure, framework-free client-side validation for the Login and
 * Registration forms. No backend/API calls happen here — this only
 * checks the shape of the data the user typed. The server re-checks everything.
 */

export type FormErrors = Record<string, string>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export function validateLoginForm(values: LoginFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

// Same rules as the backend (backend/utils/validators.js). The server checks them again.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

export function validateRegisterForm(values: RegisterFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  } else if (values.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (values.password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  } else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = "Password must contain at least one letter and one number.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.password && values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!values.acceptedTerms) {
    errors.acceptedTerms = "You must accept the Terms & Conditions.";
  }

  return errors;
}

export function isFormValid(errors: FormErrors): boolean {
  return Object.keys(errors).length === 0;
}
