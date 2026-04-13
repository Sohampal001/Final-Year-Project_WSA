import mongoose from "mongoose";

export const connectDatabase = async (): Promise<void> => {
  try {
    const MONGODB_URI =
      process.env.NODE_ENV! === "production"
        ? process.env.MONGODB_URI!
        : "mongodb://localhost:27017/suraksha";

    // MongoDB connection options
    const options = {
      autoIndex: true, // Build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, options);

    console.log("✅ MongoDB connected successfully : " + MONGODB_URI);
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("🔗 MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️  MongoDB disconnected");
    });

    // Handle application termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("🛑 MongoDB connection closed due to app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", (error as Error).message);
    console.error(
      "💡 Please ensure MongoDB is running and the connection string is correct",
    );
    process.exit(1);
  }
};

/**
 * Close MongoDB connection
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
  } catch (error) {
    console.error(
      "❌ Error closing MongoDB connection:",
      (error as Error).message,
    );
  }
};

/**
 * Get connection status
 */
export const getDatabaseStatus = (): string => {
  const state = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[state as keyof typeof states] || "unknown";
};
