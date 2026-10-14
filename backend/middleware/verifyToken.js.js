import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
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