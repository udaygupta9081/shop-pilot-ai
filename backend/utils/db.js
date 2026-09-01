import mongoose from "mongoose";

const connectDB = async (URI) => {
    try {
        await mongoose.connect(URI);
        console.log("Database connected successfully");
    } catch (error) {
        console.log(`Error: ${error}`);
    }

}


export default connectDB;