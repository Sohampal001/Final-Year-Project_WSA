import { Router } from "express";
import { NearbyPlacesController } from "../controllers/nearbyPlacesController";
import { authenticate } from "../middlewares/auth";

const router = Router();

/**
 * @route   GET /api/nearby-places/categories
 * @desc    Get nearby places grouped by category (police stations, hospitals, pharmacies, bus stops)
 * @access  Private (requires authentication)
 * @query   { latitude, longitude, radius?, limitPerCategory? }
 */
router.get(
  "/categories",
  authenticate,
  NearbyPlacesController.getNearbyPlacesByCategory
);

/**
 * @route   GET /api/nearby-places
 * @desc    Get nearby places of a specific type
 * @access  Private (requires authentication)
 * @query   { latitude, longitude, type?, radius?, limit? }
 */
router.get("/", authenticate, NearbyPlacesController.getNearbyPlaces);

export default router;
