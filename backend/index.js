import express from 'express';
import cors from 'cors'; // ADDED: browser frontend needs CORS
import mongoose from 'mongoose'; // ADDED: used by /api/health
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import cookieParser from 'cookie-parser';
import authRoute from './Routes/authRoute.js';
import chatRoutes from "./Routes/chatRoutes.js"
import { isAllowedOrigin } from "./utils/origins.js" // ADDED: shared CORS / CSRF origin rules
import categoriesRouter from "./catalog/routes/categories.js" // ADDED: product catalog
import productsRouter from "./catalog/routes/products.js" // ADDED: product catalog

dotenv.config();
const app = express();

app.disable("x-powered-by"); // ADDED: do not advertise Express
// ADDED: set TRUST_PROXY=1 when the app runs behind a proxy/host (Render, Railway, Nginx...) so rate limiting sees real IPs
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// ADDED: friendly start-up hints (values are never printed)
if (!process.env.GOOGLE_CLIENT_ID) console.log("Note: GOOGLE_CLIENT_ID is not set - 'Continue with Google' stays disabled until you add it to .env");


// ADDED: allow the React app (and its cookies) to call this API
app.use(cors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)), // rules live in utils/origins.js
    credentials: true
}));
app.use(express.json({ limit: "10kb" })); // CHANGED: small JSON bodies only
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

// ADDED: unknown /api paths return JSON instead of an HTML 404 page
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// CHANGED: argument order must be (err, req, res, next) for Express to treat this as the error handler
app.use((err, req, res, next) => {
    const errorStatus = err.status || 500;
    // CHANGED: server errors (5xx) never leak internal details in production
    const errorMessage = (errorStatus < 500 || process.env.NODE_ENV !== "production") ? (err.message || "Something went wrong") : "Something went wrong"

    return res.status(errorStatus).json({
        success: false,
        status: errorStatus,
        message: errorMessage,
        error: errorMessage, // ADDED: the React API client reads `error`
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack // CHANGED: no stack traces in production
    })
}
)

const PORT = process.env.PORT || 4000; // CHANGED: still 4000 by default
app.listen(PORT, () => {
    connectDB(process.env.MONGO_URI || process.env.MONGODB_URI); // CHANGED: also accepts the old MONGODB_URI name
    console.log(`server is running on : port number ${PORT}`);
})
