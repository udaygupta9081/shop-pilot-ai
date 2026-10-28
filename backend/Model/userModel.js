import mongoose from "mongoose"

const { Schema } = mongoose

const userSchema = new Schema({
    name: {
        type: String,
        trim: true,
        maxlength: 50
    },
    // LEGACY: older versions required a unique `username`. A database that already ran them
    // may still have that unique index, so we keep the field and always fill it with the email.
    username: {
        type: String,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    // bcrypt hash. Missing for Google-only accounts. Never returned by queries unless asked for.
    passwordHash: {
        type: String,
        select: false
    },
    // LEGACY: hash written by the old signup. Login upgrades it into passwordHash automatically.
    password: {
        type: String,
        select: false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // many users have no googleId, so only index the ones that do
    },
    profileImage: {
        type: String
    },
    authProviders: {
        type: [{ type: String, enum: ["local", "google"] }],
        default: ["local"]
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    img: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: false,
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

// The only user fields the browser is allowed to see.
userSchema.methods.toPublic = function () {
    return {
        id: this._id.toString(),
        name: this.name || this.username || this.email,
        email: this.email,
        profileImage: this.profileImage || this.img || null,
        authProviders: this.authProviders && this.authProviders.length ? this.authProviders : ["local"],
        createdAt: this.createdAt
    }
}

export default mongoose.models.User || mongoose.model("User", userSchema)
