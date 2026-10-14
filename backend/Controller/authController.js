import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../Model/userModel.js"


export const signUp = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.findOne({ email })
        if (user) return res.status(403).json("User already exists")
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const newUser = new User({ username, email, password: hash });
        await newUser.save();
        res.status(201).json({ message: "User created successfully", newUser });
    } catch (error) {
        next(error)
    }
}

export const signIn = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user) return res.status(404).json("User not found")
        const isPasswordValid = bcrypt.compareSync(req.body.password, user.password)
        if (!isPasswordValid) return res.status(401).json("Invalid password")
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })
        const { password, ...otherDetails } = user._doc
        res.cookie("access_token", token, { httpOnly: true }).status(200).json(otherDetails)
    } catch (error) {
        next(error)
    }
}

export const logout = (req, res, next) => {
    try {
        res.clearCookie("access_token")
        res.status(200).json("Logged out successfully")
    } catch (error) {
        next(error)
    }
}   
