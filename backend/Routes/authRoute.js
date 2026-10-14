import { signUp, signIn, logout } from "../Controller/authController.js"
import express from 'express'

const router = express.Router()

router.post("/signup", signUp)
router.post("/signin", signIn)
router.post("/logout", logout)

export default router