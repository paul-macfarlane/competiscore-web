import { z } from "zod";

export const handleNotificationSchema = z.object({
  notificationType: z.string(),
  notificationId: z.string(),
  action: z.string(),
});
