import type {
  Notification,
  NotificationListQuery,
  NotificationPage
} from "./notification.js";

export interface NotificationRepository {
  save(notification: Notification): void;
  listByRecipient(recipientId: string, query: NotificationListQuery): NotificationPage;
  countUnread(recipientId: string): number;
  markRead(recipientId: string, notificationIds?: string[]): number;
  findByIds(notificationIds: string[]): Notification[];
}
