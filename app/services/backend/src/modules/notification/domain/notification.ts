export const notificationTypes = [
  "new_requirement",
  "new_knowledge",
  "mention",
  "task_changed",
  "assign_request",
  "assign_result",
  "new_message"
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export type NotificationEntityType = "thread" | "task" | "message";

export type Notification = {
  id: string;
  recipientId: string;
  type: NotificationType;
  titleSummary: string;
  relatedEntityType: NotificationEntityType;
  relatedEntityId: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListQuery = {
  isRead?: boolean;
  page: number;
  pageSize: number;
};

export type NotificationPage = {
  items: Array<{
    notification_id: string;
    type: NotificationType;
    title_summary: string;
    is_read: boolean;
    related_entity_type: NotificationEntityType;
    related_entity_id: string;
    created_at: string;
  }>;
  total: number;
  page: number;
  page_size: number;
};
