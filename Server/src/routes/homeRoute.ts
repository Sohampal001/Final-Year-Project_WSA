import { Router } from "express";
import { authenticate } from "../middlewares/auth.ts";
import { HomeController } from "../controllers/homeController.ts";

const router = Router();

/**
 * @route   GET /api/home
 * @desc    Return user home data in a single payload
 * @access  Private (requires authentication)
 */
router.get("/", authenticate, HomeController.getHomeData);

export const homeRoute = router;
