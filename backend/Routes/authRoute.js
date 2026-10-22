import express from 'express'
import rateLimit from "express-rate-limit"
import { register, login, googleLogin, me, logout } from "../Controller/authController.js"
import { requireAuth } from "../middleware/requireAuth.js"
import { requireTrustedOrigin } from "../utils/origins.js"

const router = express.Router()

// Rate limits (per IP) slow down password guessing and spam sign-ups.
const limiter = (limit, windowMinutes, message) =>
    rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { error: message }
    })

const loginLimiter = limiter(10, 15, "Too many login attempts. Please try again in 15 minutes.")
const registerLimiter = limiter(10, 60, "Too many sign-up attempts. Please try again later.")
const googleLimiter = limiter(20, 15, "Too many Google sign-in attempts. Please try again in 15 minutes.")

router.use(requireTrustedOrigin) // blocks POSTs that come from unknown websites

router.post("/register", registerLimiter, register)
router.post("/login", loginLimiter, login)
router.post("/google", googleLimiter, googleLogin)
router.get("/me", requireAuth, me)
router.post("/logout", logout)

// Old route names still work, so nothing that already calls them breaks.
router.post("/signup", registerLimiter, register)
router.post("/signin", loginLimiter, login)

export default router
