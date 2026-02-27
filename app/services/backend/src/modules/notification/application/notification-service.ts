import { randomUUID } from "node:crypto";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import type { DomainEventBus } from "../../../shared/interface/domain-event-bus.js";
import type {
  Notification,
  NotificationEntityType,
  NotificationListQuery,
  NotificationPage,
  NotificationType
} from "../domain/notification.js";
import type { NotificationRepository } from "../domain/notification-repository.js";

export type CreateNotificationInput = {
  recipientId: string;
  type: NotificationType;
  titleSummary: string;
  relatedEntityType: NotificationEntityType;
  relatedEntityId: string;
};

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly domainEventBus?: DomainEventBus
  ) {}

  listNotifications(recipientId: string, query: NotificationListQuery): NotificationPage {
    return this.repository.listByRecipient(recipientId, query);
  }

  getUnreadCount(recipientId: string): { count: number } {
    return {
      count: this.repository.countUnread(recipientId)
    };
  }

  markRead(recipientId: string, notificationIds?: string[]): { marked_count: number } {
    if (notificationIds && notificationIds.length > 0) {
      const notifications = this.repository.findByIds(notificationIds);

      for (const notification of notifications) {
        if (notification.recipientId !== recipientId) {
          throw new AppError(ErrorCode.Forbidden, "notification does not belong to current user", 403);
        }
      }
    }

    return {
      marked_count: this.repository.markRead(recipientId, notificationIds)
    };
  }

  createNotification(input: CreateNotificationInput): { notification_id: string } {
    const notification: Notification = {
      id: randomUUID(),
      recipientId: input.recipientId,
      type: input.type,
      titleSummary: input.titleSummary,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    this.repository.save(notification);

    this.domainEventBus?.publish({
      name: "NotificationCreated",
      payload: {
        notification_id: notification.id,
        recipient_id: notification.recipientId,
        type: notification.type,
        title_summary: notification.titleSummary,
        related_entity_type: notification.relatedEntityType,
        related_entity_id: notification.relatedEntityId,
        created_at: notification.createdAt
      }
    });

    return {
      notification_id: notification.id
    };
  }
}
