import express from "express";
import {
  signup,
  login,
  getUserById,
  updateUser,
  updatePassword,
  addRole,
  removeRole,
  suspendUser,
  activateUser,
  deleteUser,
  getAllUsers,
  checkUserExists,
  sendEmailOTP,
  verifyEmailOTP,
} from "../controllers/userController";
import { authenticate, authorize } from "../middlewares/auth";

const router = express.Router();

// Public routes - No authentication required
router.post("/signup", signup);
router.post("/login", login);
router.get("/check-exists", checkUserExists);

// Protected routes - Authentication required
router.use(authenticate); // All routes below require authentication

// OTP routes
router.post("/send-email-otp", sendEmailOTP);
router.post("/verify-email-otp", verifyEmailOTP);

// User management routes
router.get("/users", authorize("VOLUNTEER"), getAllUsers); // Only volunteers can see all users
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Password management
router.put("/users/:id/password", updatePassword);

// Role management - Only volunteers can manage roles
router.post("/users/:id/roles", authorize("VOLUNTEER"), addRole);
router.delete("/users/:id/roles", authorize("VOLUNTEER"), removeRole);

// Account status management - Only volunteers can manage account status
router.put("/users/:id/suspend", authorize("VOLUNTEER"), suspendUser);
router.put("/users/:id/activate", authorize("VOLUNTEER"), activateUser);

export const userRoute = router;
