import express from 'express';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import cookieParser from 'cookie-parser';
import authRoute from './Routes/authRoute.js';
import chatRoutes from "./Routes/chatRoutes.js"

dotenv.config();
const app = express();


app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute)
app.use("/api/conversation", chatRoutes)

app.use((req, res, err, next) => {
    const errorStatus = err.status || 500;
    const errorMessage = err.message || "Something went wrong"

    return res.status(errorStatus).json({
        success: false,
        status: errorStatus,
        message: errorMessage,
        stack: err.stack
    })
}
)

app.listen(4000, () => {
    connectDB(process.env.MONGO_URI);
    console.log(`server is running on : port number 4000`);
})
