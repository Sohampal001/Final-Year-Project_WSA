import express from "express";
import { sendSMS } from "../controllers/smsController";
import { authenticate } from "../middlewares/auth";

export const smsRoute = express
  .Router()
  .post("/send-sms", authenticate, sendSMS);
