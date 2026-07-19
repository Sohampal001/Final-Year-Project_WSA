import { Router } from "express";
import { PushController } from "../controllers/pushController.ts";
import { authenticate } from "../middlewares/auth.ts";

const router = Router();

/**
 * @route   POST /api/push/token
 * @desc    Save the current user's Expo push token
 * @access  Private (requires authentication)
 * @body    { expoPushToken }
 */
router.post("/token", authenticate, PushController.savePushToken);

/**
 * @route   POST /api/push/token/remove
 * @desc    Remove an Expo push token from the current user (e.g. on logout)
 * @access  Private (requires authentication)
 * @body    { expoPushToken }
 */
router.post("/token/remove", authenticate, PushController.removePushToken);

export { router as pushRoute };
