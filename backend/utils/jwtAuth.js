// ADDED: Routes/chatRoutes.js imports { verifyToken } from "../utils/jwtAuth.js",
// but that file did not exist (the middleware lives in middleware/verifyToken.js.js
// and has no export). This file provides the missing export with the SAME logic,
// so the original files do not need to be edited.
import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try {
        const token = req.cookies.access_token;
        if (!token) return res.status(401).json("Unauthorized");

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.status(401).json("Forbidden")
            req.user = user
            next()
        })
    } catch (error) {
        next(error)
    }
}
