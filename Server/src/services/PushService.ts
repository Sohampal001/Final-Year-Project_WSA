import { Expo } from "expo-server-sdk";
import type { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

export interface PushMessageInput {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
}

class PushService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  /**
   * Send push notifications through Expo.
   * Filters invalid tokens, chunks the payload, sends each chunk and
   * returns a flattened array of tickets (order preserved).
   * A failing chunk does not abort the remaining chunks.
   */
  async sendPush(messages: PushMessageInput[]): Promise<ExpoPushTicket[]> {
    // Keep only messages with a valid Expo push token
    const validMessages: ExpoPushMessage[] = messages
      .filter((message) => Expo.isExpoPushToken(message.to))
      .map((message) => {
        const payload: ExpoPushMessage = {
          to: message.to,
          title: message.title,
          body: message.body,
          priority: "high",
          channelId: message.channelId || "sos-alerts",
          sound: "default",
        };
        if (message.data) {
          payload.data = message.data;
        }
        return payload;
      });

    if (validMessages.length === 0) {
      return [];
    }

    const chunks = this.expo.chunkPushNotifications(validMessages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
        // Mark each message in the failed chunk as errored so ordering is kept
        for (let i = 0; i < chunk.length; i++) {
          tickets.push({
            status: "error",
            message: (error as Error).message || "Failed to send push chunk",
          } as ExpoPushTicket);
        }
      }
    }

    return tickets;
  }
}

export default new PushService();
