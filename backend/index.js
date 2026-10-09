import express from 'express';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';

dotenv.config();
const app = express();


app.use(express.json());


app.listen(4000, () => {
    connectDB(process.env.MONGO_URI);
    console.log(`server is running on : port number 4000`);
})
