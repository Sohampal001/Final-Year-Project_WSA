import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

class FAST2SMS {
  private FAST2SMS_API_KEY: string;
  private FAST2SMS_API_ROUTE: string;
  constructor() {
    if (!process.env.FAST2SMS_API_KEY) {
      throw new Error(
        "FAST2SMS_API_KEY is not defined in environment variables"
      );
    }
    this.FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY!;
    this.FAST2SMS_API_ROUTE = "https://www.fast2sms.com/dev/bulkV2";
  }
  async sendMessage(message: string, numbersArray: string[]) {
    try {
      const config = {
        route: "q",
        message: message,
        flash: "0",
        numbers: numbersArray.join(","), // Convert array to comma-separated string
      };

      console.log("📤 Sending SMS with config:", {
        route: config.route,
        messageLength: message.length,
        recipientCount: numbersArray.length,
      });

      const response = await axios.post(this.FAST2SMS_API_ROUTE, config, {
        headers: {
          authorization: this.FAST2SMS_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      console.log("✅ SMS Sent Successfully:", response.data);
      return {
        ...response.data,
        sent: true,
        request_id: response.data.request_id,
      };
    } catch (error: unknown) {
      console.error("❌ SMS Service Error:", (error as any)?.response?.data);
      throw new Error(
        `${(error as any)?.response?.data?.message || "Failed to send SMS"}`
      );
    }
  }
}

export default new FAST2SMS();
