import type {
  Notification,
  NotificationListQuery,
  NotificationPage
} from "../domain/notification.js";
import type { NotificationRepository } from "../domain/notification-repository.js";

export class NotificationMemoryRepository implements NotificationRepository {
  private readonly notifications = new Map<string, Notification>();

  save(notification: Notification): void {
    this.notifications.set(notification.id, notification);
  }

  listByRecipient(recipientId: string, query: NotificationListQuery): NotificationPage {
    const filtered = [...this.notifications.values()]
      .filter((notification) => notification.recipientId === recipientId)
      .filter((notification) => (query.isRead === undefined ? true : notification.isRead === query.isRead))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    const offset = (query.page - 1) * query.pageSize;
    const pageItems = filtered.slice(offset, offset + query.pageSize);

    return {
      items: pageItems.map((notification) => ({
        notification_id: notification.id,
        type: notification.type,
        title_summary: notification.titleSummary,
        is_read: notification.isRead,
        related_entity_type: notification.relatedEntityType,
        related_entity_id: notification.relatedEntityId,
        created_at: notification.createdAt
      })),
      total: filtered.length,
      page: query.page,
      page_size: query.pageSize
    };
  }

  countUnread(recipientId: string): number {
    return [...this.notifications.values()].filter(
      (notification) => notification.recipientId === recipientId && !notification.isRead
    ).length;
  }

  markRead(recipientId: string, notificationIds?: string[]): number {
    let markedCount = 0;
    const targetIds = notificationIds ? new Set(notificationIds) : null;

    for (const notification of this.notifications.values()) {
      const shouldProcessId = targetIds ? targetIds.has(notification.id) : true;

      if (!shouldProcessId || notification.recipientId !== recipientId || notification.isRead) {
        continue;
      }

      notification.isRead = true;
      markedCount += 1;
    }

    return markedCount;
  }

  findByIds(notificationIds: string[]): Notification[] {
    return notificationIds
      .map((notificationId) => this.notifications.get(notificationId))
      .filter((notification): notification is Notification => Boolean(notification));
  }
}
