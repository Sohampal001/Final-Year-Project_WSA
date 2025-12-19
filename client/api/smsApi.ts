import axios from "axios";
import type { Location } from "../store/useLocationStore";
const sendSMS = async (location: Location, numbersArray: string[]) => {
  try {
    console.log(location + " " + location.lat + " " + location.lon);

    const GMapLink = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lon}`;
    const response = await axios.post(
      `https://bntjhcxw-3000.inc1.devtunnels.ms/api/send-sms`,
      {
        location: GMapLink,
        numbersArray,
      }
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", (error as Error).message);
    return error;
  }
};

export default sendSMS;
