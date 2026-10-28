import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try {
        const token = req.cookies.access_token;
        console.log("Token:", token)
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