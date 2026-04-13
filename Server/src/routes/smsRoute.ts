import express from "express";
import { sendSMS } from "../controllers/smsController.ts";
import { authenticate } from "../middlewares/auth.ts";

export const smsRoute = express
  .Router()
  .post("/send-sms", authenticate, sendSMS);
