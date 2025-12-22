import axios, { isAxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Location } from "../store/useLocationStore";

const sendSMS = async (location: Location, numbersArray?: string[]) => {
  try {
    console.log("📱 Sending SOS SMS...");
    console.log("📍 Location:", location.lat, location.lon);
    console.log("📞 Numbers:", numbersArray);

    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      throw new Error("Not authenticated. Please login again.");
    }

    const GMapLink = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lon}`;

    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_API_URL!}/send-sms`,
      {
        location: GMapLink,
        latitude: location.lat,
        longitude: location.lon,
        numbersArray: numbersArray || [], // Send empty array if no numbers, backend will fetch from DB
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ SOS SMS Response:", response.data);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error("❌ SOS SMS Error:", error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || "Failed to send emergency alerts"
      );
    }
    console.error("❌ Error sending SOS:", (error as Error).message);
    throw error;
  }
};

export default sendSMS;
