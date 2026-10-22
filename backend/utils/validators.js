// Server-side validation for the auth endpoints.
// The frontend runs the same rules (src/utils/authValidation.ts) for instant feedback,
// but the server NEVER trusts the browser, so every rule is checked again here.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt only uses the first 72 bytes

/** Lower-cases and trims an email so "A@x.com" and "a@x.com" are the same account. */
export const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const isString = (v) => typeof v === "string";

function emailError(value) {
    if (!isString(value) || !value.trim()) return "Email is required.";
    const email = value.trim();
    if (email.length > 254 || !EMAIL_RE.test(email)) return "Enter a valid email address.";
    return null;
}

function passwordStrengthError(value) {
    if (!isString(value) || !value) return "Password is required.";
    if (value.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
    if (value.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Password must contain at least one letter and one number.";
    return null;
}

/** Returns an object like { email: "Enter a valid email address." }. Empty object = valid. */
export function validateRegistration(body = {}) {
    const errors = {};
    if (!isString(body.name) || body.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
    else if (body.name.trim().length > 50) errors.name = "Name must be at most 50 characters.";

    const e = emailError(body.email);
    if (e) errors.email = e;

    const p = passwordStrengthError(body.password);
    if (p) errors.password = p;

    // The UI has a "confirm password" box. If it is sent, it must match.
    if (body.confirmPassword !== undefined && body.confirmPassword !== body.password) {
        errors.confirmPassword = "Passwords do not match.";
    }
    return errors;
}

/** Login only checks the shape. Strength rules are NOT applied (old passwords must still work). */
export function validateLogin(body = {}) {
    const errors = {};
    const e = emailError(body.email);
    if (e) errors.email = e;
    if (!isString(body.password) || !body.password) errors.password = "Password is required.";
    else if (body.password.length > 1024) errors.password = "Password is too long.";
    return errors;
}
