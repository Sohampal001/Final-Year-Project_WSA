import { Router } from "express";
import { LocationController } from "../controllers/locationController";
import { authenticate } from "../middlewares/auth";

const router = Router();

/**
 * @route   POST /api/location/update
 * @desc    Update user's current location
 * @access  Private (requires authentication)
 * @body    { latitude, longitude, accuracy?, altitude?, speed?, heading?, timestamp? }
 */
router.post("/update", authenticate, LocationController.updateLocation);

/**
 * @route   POST /api/location/nearby
 * @desc    Get nearby users within specified radius (default 500m)
 * @access  Private (requires authentication)
 * @body    { latitude, longitude, radius? }
 */
router.post("/nearby", authenticate, LocationController.getNearbyUsers);

/**
 * @route   GET /api/location/current
 * @desc    Get current user's last location
 * @access  Private (requires authentication)
 */
router.get("/current", authenticate, LocationController.getCurrentLocation);

/**
 * @route   GET /api/location/history
 * @desc    Get location history for current user
 * @access  Private (requires authentication)
 * @query   limit? (default: 50)
 */
router.get("/history", authenticate, LocationController.getLocationHistory);

export { router as locationRoute };
