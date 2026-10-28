import bcrypt from "bcryptjs"
import { OAuth2Client } from "google-auth-library"
import User from "../Model/userModel.js"
import { createSession, destroySession, destroyAllSessions } from "../utils/session.js"
import { normalizeEmail, validateRegistration, validateLogin } from "../utils/validators.js"

const BCRYPT_ROUNDS = 12
// Used when the email is unknown, so "wrong email" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-1", BCRYPT_ROUNDS)
const googleClient = new OAuth2Client()

const INVALID_LOGIN = { error: "Invalid email or password." }

// ---------------------------------------------------------------- POST /api/auth/register
export const register = async (req, res, next) => {
    try {
        const body = req.body || {}
        const fieldErrors = validateRegistration(body)
        if (Object.keys(fieldErrors).length) {
            return res.status(400).json({ error: "Please fix the highlighted fields.", fieldErrors })
        }

        const email = normalizeEmail(body.email)
        const existing = await User.findOne({ email }).select("+passwordHash +password")
        if (existing) {
            const googleOnly = !existing.passwordHash && !existing.password
            return res.status(409).json({
                error: "This email is already registered.",
                fieldErrors: {
                    email: googleOnly
                        ? "This email is registered with Google. Use Continue with Google."
                        : "An account with this email already exists. Try logging in."
                }
            })
        }

        const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS) // never store the plain password
        const user = await User.create({
            name: body.name.trim(),
            username: email, // legacy field, see userModel.js
            email,
            passwordHash,
            authProviders: ["local"]
        })

        // Sign the new user in straight away.
        await createSession(req, res, user, { remember: false })
        res.status(201).json({ message: "Account created successfully.", user: user.toPublic() })
    } catch (error) {
        if (error?.code === 11000) {
            // two people registered the same email at the same moment
            return res.status(409).json({ error: "This email is already registered.", fieldErrors: { email: "An account with this email already exists. Try logging in." } })
        }
        next(error)
    }
}

// ---------------------------------------------------------------- POST /api/auth/login
export const login = async (req, res, next) => {
    try {
        const body = req.body || {}
        const fieldErrors = validateLogin(body)
        if (Object.keys(fieldErrors).length) {
            return res.status(400).json({ error: "Please fix the highlighted fields.", fieldErrors })
        }

        const email = normalizeEmail(body.email)
        const user = await User.findOne({ email }).select("+passwordHash +password")
        const storedHash = user?.passwordHash || user?.password // `password` = hash from the old signup

        const passwordOk = await bcrypt.compare(body.password, storedHash || DUMMY_HASH)
        // One generic message for every failure, so attackers cannot learn which emails exist.
        if (!user || !storedHash || !passwordOk) return res.status(401).json(INVALID_LOGIN)

        if (!user.passwordHash) {
            // move an old-style account over to the new field
            await User.updateOne({ _id: user._id }, { $set: { passwordHash: storedHash }, $unset: { password: 1 } })
        }

        await createSession(req, res, user, { remember: body.rememberMe === true })
        res.status(200).json({ message: "Logged in successfully.", user: user.toPublic() })
    } catch (error) {
        next(error)
    }
}

// ---------------------------------------------------------------- POST /api/auth/google
// The browser sends the Google ID token ("credential"). We verify it with Google's library.
// We never trust name/email sent by the frontend, only what is inside the verified token.
export const googleLogin = async (req, res, next) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID
        if (!clientId) return res.status(503).json({ error: "Google sign-in is not configured on the server." })

        const credential = req.body?.credential
        if (typeof credential !== "string" || !credential || credential.length > 4096) {
            return res.status(400).json({ error: "Google credential is required." })
        }

        let payload
        try {
            const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId }) // checks signature, expiry, audience
            payload = ticket.getPayload()
        } catch {
            return res.status(401).json({ error: "Google sign-in failed. Please try again." })
        }
        if (!payload?.sub || !payload.email || payload.email_verified !== true) {
            return res.status(401).json({ error: "Your Google email address is not verified." })
        }

        const email = normalizeEmail(payload.email)
        let user = await User.findOne({ googleId: payload.sub })

        if (!user) {
            const sameEmail = await User.findOne({ email }).select("+passwordHash +password")
            if (sameEmail) {
                // LINK: Google just proved this person owns the email, so attach the Google identity.
                // Safety: if the old account has a password, nobody ever proved they own that email
                // (we have no email verification), so someone else may have registered it first.
                // We remove that password and end its sessions. The real owner now signs in with Google.
                const hadPassword = !!(sameEmail.passwordHash || sameEmail.password)
                const wasVerified = sameEmail.emailVerified === true
                sameEmail.googleId = payload.sub
                sameEmail.emailVerified = true
                if (!sameEmail.authProviders.includes("google")) sameEmail.authProviders.push("google")
                if (!sameEmail.profileImage && payload.picture) sameEmail.profileImage = payload.picture
                if (!sameEmail.name) sameEmail.name = (payload.name || email.split("@")[0]).slice(0, 50)
                if (hadPassword && !wasVerified) {
                    sameEmail.passwordHash = undefined
                    sameEmail.password = undefined
                    sameEmail.authProviders = sameEmail.authProviders.filter((p) => p !== "local")
                    await destroyAllSessions(sameEmail._id)
                }
                await sameEmail.save()
                user = sameEmail
            } else {
                user = await User.create({
                    name: (payload.name || email.split("@")[0]).slice(0, 50),
                    username: email, // legacy field, see userModel.js
                    email,
                    googleId: payload.sub,
                    profileImage: payload.picture || undefined,
                    authProviders: ["google"],
                    emailVerified: true
                })
            }
        }

        await createSession(req, res, user, { remember: true })
        res.status(200).json({ message: "Signed in with Google.", user: user.toPublic() })
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ error: "Could not complete Google sign-in. Please try again." })
        next(error)
    }
}

// ---------------------------------------------------------------- GET /api/auth/me
// requireAuth already loaded the user (or answered 401).
export const me = (req, res) => {
    res.status(200).json({ user: req.authUser.toPublic() })
}

// ---------------------------------------------------------------- POST /api/auth/logout
export const logout = async (req, res, next) => {
    try {
        await destroySession(req, res) // deletes the session in MongoDB and clears the cookie
        res.status(200).json({ message: "Logged out successfully." })
    } catch (error) {
        next(error)
    }
}
