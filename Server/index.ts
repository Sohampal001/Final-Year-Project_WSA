import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDatabase } from "./src/configs/database.ts";
import { smsRoute } from "./src/routes/smsRoute.ts";
import { otpRoute } from "./src/routes/otpRoute.ts";
import { userRoute } from "./src/routes/userRoute.ts";
import { onboardingRoute } from "./src/routes/onboardingRoute.ts";
import { codeWordRoute } from "./src/routes/codeWordRoute.ts";
import { trustedContactRoute } from "./src/routes/trustedContactRoute.ts";
import { locationRoute } from "./src/routes/locationRoute.ts";
import { requestLogger } from "./src/middlewares/requestLogger.ts";
import { nearbyPlacesRoute } from "./src/routes/nearbyPlacesRoute.ts";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Custom logging middleware
app.use(requestLogger);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
  });
});

// API Routes
app.use("/api/sms", smsRoute);
app.use("/api/otp", otpRoute);
app.use("/api/users", userRoute);
app.use("/api/onboarding", onboardingRoute);
app.use("/api/codeword", codeWordRoute);
app.use("/api/trusted-contacts", trustedContactRoute);
app.use("/api/location", locationRoute);
app.use("/api/nearby-places", nearbyPlacesRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("❌ Server Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  },
);

// Start server function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
