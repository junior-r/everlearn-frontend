import { apiClient } from "@/shared/api";
import type { AppNotification, NotificationList } from "./model/types";

export { notificationPath, NOTIFICATION_TYPES } from "./model/types";
export type { AppNotification, NotificationList, NotificationType } from "./model/types";

/** The signed-in user's latest notices and how many are unread, whatever institution they come from. */
export function fetchNotifications(): Promise<NotificationList> {
  return apiClient.request<NotificationList>("/notifications");
}

/** Marks notices as read: the given ones, or every one when none are named. */
export function markNotificationsRead(notifications?: AppNotification[]): Promise<void> {
  return apiClient.request<void>("/notifications/read", {
    method: "POST",
    body: notifications ? { ids: notifications.map((notification) => notification.id) } : {},
  });
}
