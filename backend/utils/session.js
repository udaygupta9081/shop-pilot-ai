import crypto from "node:crypto";
import Session from "../Model/sessionModel.js";

export const COOKIE_NAME = "sid";
const DAY_MS = 24 * 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/** HttpOnly = JavaScript cannot read it. Secure = HTTPS only (always in production). */
function cookieOptions(maxAgeMs) {
    let sameSite = String(process.env.COOKIE_SAMESITE || "lax").toLowerCase();
    if (!["lax", "strict", "none"].includes(sameSite)) sameSite = "lax";
    const secure = process.env.NODE_ENV === "production" || sameSite === "none"; // browsers require Secure with SameSite=None
    return { httpOnly: true, secure, sameSite, path: "/", ...(maxAgeMs ? { maxAge: maxAgeMs } : {}) };
}

/** Creates a server-side session and sends its token to the browser as a cookie. */
export async function createSession(req, res, user, { remember = false } = {}) {
    const token = crypto.randomBytes(32).toString("base64url");
    const ttl = remember ? 30 * DAY_MS : DAY_MS;
    await Session.create({
        tokenHash: hashToken(token),
        userId: user._id,
        expiresAt: new Date(Date.now() + ttl),
        userAgent: (req.get("user-agent") || "").slice(0, 200),
    });
    // "Remember me" = a 30-day cookie. Otherwise a browser-session cookie (gone when the browser closes).
    res.cookie(COOKIE_NAME, token, cookieOptions(remember ? ttl : undefined));
}

/** Returns the live session for a cookie token, or null. */
export async function findSession(token) {
    if (typeof token !== "string" || !token) return null;
    return Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
}

/** Deletes the session on the server AND clears the cookie. */
export async function destroySession(req, res) {
    const token = req.cookies?.[COOKIE_NAME];
    if (typeof token === "string" && token) await Session.deleteOne({ tokenHash: hashToken(token) });
    res.clearCookie(COOKIE_NAME, cookieOptions());
}

/** Logs a user out of every device (used when their password is removed or changed). */
export const destroyAllSessions = (userId) => Session.deleteMany({ userId });
