import mongoose from "mongoose"

const { Schema } = mongoose

// One document = one logged-in browser. The cookie holds a random token;
// only its SHA-256 hash is stored here, so a database leak cannot be used to log in.
const sessionSchema = new Schema({
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String }
}, { timestamps: true })

// MongoDB deletes expired sessions automatically (TTL index).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.Session || mongoose.model("Session", sessionSchema)
