import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app: Express = express();

// Trust reverse proxy (Cloudflare, nginx, etc.) for correct secure cookies & client IP detection
app.set("trust proxy", 1);

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for uploads (avatars, etc.)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Parse allowed origins from environment
const rawAllowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
  process.env.FRONTEND_URL || "",
  "http://localhost:3000",
  "https://localhost:3000",
  "http://127.0.0.1:3000",
  "https://127.0.0.1:3000",
  "http://192.168.0.2:3000",
  "https://192.168.0.2:3000",
];

const allowedOrigins = rawAllowedOrigins
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

// CORS configuration for credentials (accepts local origins & Cloudflare trycloudflare subdomains)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.trim().replace(/\/$/, "");
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith(".trycloudflare.com") ||
        cleanOrigin.endsWith("trycloudflare.com")
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Health Endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "QR-Based Smart Attendance System API is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api", routes);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
