import User from "../Model/userModel.js";
import { COOKIE_NAME, findSession } from "../utils/session.js";

/**
 * Protects a route. Reads the session cookie, finds the session in MongoDB, loads the user.
 *   router.get("/private", requireAuth, handler)
 * Inside the handler: req.user.id (string) and req.authUser (the Mongoose document).
 */
export const requireAuth = async (req, res, next) => {
    try {
        const session = await findSession(req.cookies?.[COOKIE_NAME]);
        if (!session) {
            res.clearCookie(COOKIE_NAME, { path: "/" });
            return res.status(401).json({ error: "Not authenticated. Please log in." });
        }
        const user = await User.findById(session.userId);
        if (!user) return res.status(401).json({ error: "Not authenticated. Please log in." });
        req.user = { id: user._id.toString() };
        req.authUser = user;
        next();
    } catch (error) {
        next(error);
    }
};
