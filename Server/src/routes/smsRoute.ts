import express from "express";
import { sendSMS } from "../controllers/smsController";

export const smsRoute = express.Router().post("/send-sms", sendSMS);