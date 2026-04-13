import sendSMS from "@/api/smsApi";
import { useLocationStore } from "@/store/useLocationStore";
import { useAuthStore } from "@/store/useAuthStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Queue for offline resilience
export const storeFailedSosRequest = async (phoneNumbers: string[], location: any) => {
  try {
    const queueItem = { phoneNumbers, location, timestamp: Date.now() };
    const queue = await AsyncStorage.getItem("failedSosQueue");
    const parsedQueue = queue ? JSON.parse(queue) : [];
    parsedQueue.push(queueItem);
    await AsyncStorage.setItem("failedSosQueue", JSON.stringify(parsedQueue));
  } catch (e) {
    console.error("Failed to store SOS request locally:", e);
  }
};

export const processFailedRequests = async () => {
  // Basic retry mechanism - this would ideally be called on network status change
  try {
    const queue = await AsyncStorage.getItem("failedSosQueue");
    if (!queue) return;

    const parsedQueue = JSON.parse(queue);
    const remainingQueue: any[] = [];

    for (const item of parsedQueue) {
      try {
        const response = await sendSMS(item.location, item.phoneNumbers);
        if (response.success) {
          console.log("Processed queued SOS successfully");
        } else {
          remainingQueue.push(item);
        }
      } catch (e) {
        remainingQueue.push(item);
      }
    }
    await AsyncStorage.setItem("failedSosQueue", JSON.stringify(remainingQueue));
  } catch (e) {
    console.error("Failed to process queue:", e);
  }
};

export const triggerGlobalSos = async (): Promise<boolean> => {
  const authStore = useAuthStore.getState();
  const location = useLocationStore.getState().location;

  if (!location || !location.lat || !location.lon) {
    console.warn("Location unavailable for SOS.");
  }

  if (!authStore.trustedContacts || authStore.trustedContacts.length === 0) {
    console.warn("Cannot trigger SOS: No trusted contacts.");
    return false;
  }

  const phoneNumbers = authStore.trustedContacts.map(c => c.mobile);

  try {
    const response = await sendSMS(location as any, phoneNumbers);
    if (!response.success) {
      throw new Error("Backend failed to send SMS");
    }
    return true;
  } catch (error) {
    console.error("SOS Trigger Error:", error);
    // Queue locally if it fails
    await storeFailedSosRequest(phoneNumbers, location);
    // Throw so caller knows it failed synchronously
    throw error;
  }
};
