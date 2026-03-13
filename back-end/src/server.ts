import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import "dotenv/config";
import businessesRoutes from "./businesses.routes.js";
import admin from 'firebase-admin';
import pool from "./db.js";

const REQUIRED_ENV = [
  'DATABASE_URL', 'FIREBASE_SERVICE_ACCOUNT',
  'CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL',
];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
}

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
admin.initializeApp({
  credential: admin.credential.cert(credentials)
});

const app = express();

app.use(helmet());
app.use(compression());
app.use(
  cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" })
);
app.use(express.json({ limit: '1mb' }));
app.use("/api", businessesRoutes);

const port = process.env.PORT || 8000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on('SIGTERM', async () => {
  server.close();
  await pool.end();
  process.exit(0);
});
