import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export interface SosBroadcastDetail {
  id: string;
  victimName: string;
  victimMobile?: string;
  latitude: number;
  longitude: number;
  triggerType: string;
  createdAt: string;
}

async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem("authToken");
}

/**
 * Register this device's Expo push token with the backend so it can receive
 * SOS broadcast notifications.
 */
export async function registerPushToken(expoPushToken: string): Promise<void> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(`${API_URL}/push/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ expoPushToken }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Failed to register push token");
    }
  } catch (error: any) {
    console.error("Error registering push token:", error);
    throw error;
  }
}

/**
 * Deregister this device's push token (called on logout) so the device stops
 * receiving that user's SOS alerts. Best-effort — never throws.
 */
export async function removePushToken(expoPushToken: string): Promise<void> {
  try {
    const token = await getAuthToken();
    if (!token) return;
    await fetch(`${API_URL}/push/token/remove`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ expoPushToken }),
    });
  } catch (error) {
    console.error("Error removing push token:", error);
  }
}

/**
 * Fire an SOS broadcast to nearby users. Must never throw fatally — a failed
 * broadcast should never break the primary SMS SOS flow.
 */
export async function broadcastSos(
  latitude: number,
  longitude: number,
  triggerType: "VOICE" | "BUTTON",
): Promise<{ broadcastId?: string; notifiedCount?: number }> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(`${API_URL}/sos/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ latitude, longitude, triggerType }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Failed to broadcast SOS");
    }

    return {
      broadcastId: data.broadcastId,
      notifiedCount: data.notifiedCount,
    };
  } catch (error: any) {
    console.error("Error broadcasting SOS:", error);
    return {};
  }
}

/**
 * Fetch the details of a single SOS broadcast (for the recipient's alert screen).
 */
export async function getSosBroadcast(
  id: string,
): Promise<SosBroadcastDetail> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(`${API_URL}/sos/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch SOS broadcast");
    }

    return data.data;
  } catch (error: any) {
    console.error("Error fetching SOS broadcast:", error);
    throw error;
  }
}
