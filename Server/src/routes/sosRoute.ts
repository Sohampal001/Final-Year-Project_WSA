import { Router } from "express";
import { SosController } from "../controllers/sosController.ts";
import { authenticate } from "../middlewares/auth.ts";

const router = Router();

/**
 * @route   POST /api/sos/broadcast
 * @desc    Broadcast an SOS alert to nearby users (within 500m)
 * @access  Private (requires authentication)
 * @body    { latitude, longitude, triggerType? }
 */
router.post("/broadcast", authenticate, SosController.broadcast);

/**
 * @route   GET /api/sos/:id
 * @desc    Get a summary of an SOS broadcast (used by the alert deep link)
 * @access  Private (requires authentication)
 */
router.get("/:id", authenticate, SosController.getById);

export { router as sosRoute };
