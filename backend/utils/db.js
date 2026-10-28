import mongoose from "mongoose";

// Application database (users, sessions, conversations, messages): default mongoose connection.
const connectDB = async (URI) => {
    try {
        await mongoose.connect(URI);
        console.log("Application database connected successfully");
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

// Product catalog database. Models are registered on this connection up front;
// queries are buffered until connectProductDB() opens it.
export const productConnection = mongoose.createConnection();

export const connectProductDB = async (URI, options = {}) => {
    try {
        await productConnection.openUri(URI, options);
        console.log("Product database connected successfully");
    } catch (error) {
        console.log(`Error: ${error}`);
        throw error;
    }
}

export default connectDB;
