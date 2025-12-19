// This service is for sending message through "messages" app. We do not need it rn.
import * as SMS from "expo-sms";

export const checkSMSServiceAvailibity = async (): Promise<boolean> => {
  const isAvailable = await SMS.isAvailableAsync();
  return isAvailable;
};
export const sendSMS = async (): Promise<SMS.SMSResponse> => {
  return await SMS.sendSMSAsync(["9883989808"], "My sample HelloWorld message");
};
