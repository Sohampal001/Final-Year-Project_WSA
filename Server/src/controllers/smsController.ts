import type { Request, Response } from "express";
import FAST2SMS from "../services/SMSService";
import EmailService from "../services/EmailService";

export const sendSMS = async (req: Request, res: Response) => {
  try {
    const { location, numbersArray } = req.body;
    console.log("Location : ", location, " Numbers Array : ", numbersArray);
    // const response = {
    //   sent: true,
    //   request_id: "Smx1DPjWMOt4Gy7",
    //   message: ["SMS sent successfully."],
    // };

    const response = await FAST2SMS.sendMessage(location, numbersArray);
    // const response = await EmailService.sendEmail(
    //   "igsuryas13g@gmail.com",
    //   "Hello",
    //   location
    // );
    console.log(response);

    if (response?.sent) {
      return res.status(200).json(response);
    }
  } catch (error: unknown) {
    console.error("❌ SMS Sending Failed:", (error as Error).message);
    return res.status(500).json({
      sent: false,
      message: (error as Error).message,
    });
  }
};
