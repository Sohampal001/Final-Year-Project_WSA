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
  async sendMessage(location: string, numbersArray: [number]) {
    try {
      const config = {
        route: "q",
        message: `Surya is in trouble, here is my location : ${location}`,
        flash: "0",
        numbers: numbersArray,
      };
      const response = await axios.post(this.FAST2SMS_API_ROUTE, config, {
        headers: {
          authorization: this.FAST2SMS_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      console.log("✅ SMS Sent:", response);
      return { data: response.data, sent: true };
    } catch (error: unknown) {
      throw new Error(`${(error as any)?.response?.data?.message}`);
    }
  }
}

export default new FAST2SMS();
