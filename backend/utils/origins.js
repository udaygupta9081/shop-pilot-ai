// Which browser origins (frontend addresses) may call this API.
// Read lazily because index.js loads .env AFTER the imports run.

export function getAllowedOrigins() {
    return (process.env.CLIENT_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
}

const isLocalDevOrigin = (o) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o);

export function isAllowedOrigin(origin) {
    if (!origin) return true; // same-origin tools such as curl/Postman send no Origin header
    if (getAllowedOrigins().includes(origin)) return true;
    // outside production any localhost port is fine (Vite moves to 5174 when 5173 is busy)
    return process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin);
}

/**
 * Extra CSRF protection for state-changing requests (POST/PUT/DELETE):
 * if the browser says the request comes from an origin we do not know, refuse it.
 */
export function requireTrustedOrigin(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (!isAllowedOrigin(req.get("origin"))) return res.status(403).json({ error: "Request origin not allowed." });
    next();
}
