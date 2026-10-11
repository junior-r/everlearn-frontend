export const NOTIFICATION_TYPES = [
  "WELCOME",
  "EVALUATION_PUBLISHED",
  "EVALUATION_DUE",
  "CLASS_STARTING",
  "DIRECT_MESSAGE",
  "GRADE_POSTED",
  "WARD_EVALUATION_PUBLISHED",
  "WARD_GRADE_POSTED",
  "WARD_ATTENDANCE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** A notice as the backend stores it: what happened, and the facts needed to word it here. */
export interface AppNotification {
  id: string;
  institutionId: string | null;
  type: NotificationType;
  data: Record<string, string | number | null>;
  read: boolean;
  /** ISO date-time. */
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

/** Where a notice leads when it is opened. */
export function notificationPath(notification: AppNotification): string {
  switch (notification.type) {
    case "EVALUATION_PUBLISHED":
    case "EVALUATION_DUE":
    case "GRADE_POSTED":
      return "/progress";
    case "WARD_EVALUATION_PUBLISHED":
    case "WARD_GRADE_POSTED":
    case "WARD_ATTENDANCE":
      return "/guardian";
    case "DIRECT_MESSAGE": {
      const { senderId } = notification.data;
      return typeof senderId === "string" ? `/messages?with=${encodeURIComponent(senderId)}` : "/messages";
    }
    case "WELCOME":
    case "CLASS_STARTING":
    default:
      return "/";
  }
}
