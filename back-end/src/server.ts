import express from "express";
import cors from "cors";
import "dotenv/config";
import businessesRoutes from "./businesses.routes.js";
import admin from 'firebase-admin';
import fs from 'fs'

const credentials = JSON.parse(
  fs.readFileSync('./credentials.json', 'utf-8')
)
admin.initializeApp({
  credential: admin.credential.cert(credentials)
});

const app = express();

app.use(
  cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" })
);
app.use(express.json());
app.use("/api", businessesRoutes);

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});