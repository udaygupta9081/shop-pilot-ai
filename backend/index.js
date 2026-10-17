import express from 'express';
import cors from 'cors'; // ADDED: browser frontend needs CORS
import mongoose from 'mongoose'; // ADDED: used by /api/health
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import cookieParser from 'cookie-parser';
import authRoute from './Routes/authRoute.js';
import chatRoutes from "./Routes/chatRoutes.js"
import categoriesRouter from "./catalog/routes/categories.js" // ADDED: product catalog
import productsRouter from "./catalog/routes/products.js" // ADDED: product catalog

dotenv.config();
const app = express();


// ADDED: allow the React app (and cookies) to call this API
app.use(cors({
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim()),
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// ADDED: health check
app.get("/api/health", (req, res) => {
    const ok = mongoose.connection.readyState === 1;
    res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded", db: ok ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoute)
app.use("/api/conversation", chatRoutes)
// ADDED: catalog endpoints (/api/categories, /api/products)
app.use("/api/categories", categoriesRouter)
app.use("/api/products", productsRouter)

// CHANGED: argument order must be (err, req, res, next) for Express to treat this as the error handler
app.use((err, req, res, next) => {
    const errorStatus = err.status || 500;
    const errorMessage = err.message || "Something went wrong"

    return res.status(errorStatus).json({
        success: false,
        status: errorStatus,
        message: errorMessage,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack // CHANGED: no stack traces in production
    })
}
)

const PORT = process.env.PORT || 4000; // CHANGED: still 4000 by default
app.listen(PORT, () => {
    connectDB(process.env.MONGO_URI);
    console.log(`server is running on : port number ${PORT}`);
})
