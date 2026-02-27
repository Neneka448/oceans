import assert from "node:assert/strict";
import test from "node:test";
import { NotificationService } from "./notification-service.js";
import { NotificationMemoryRepository } from "../infra/notification-memory-repository.js";

const createService = (): NotificationService => {
  return new NotificationService(new NotificationMemoryRepository());
};

test("should_list_notifications_with_pagination_and_filter", () => {
  const service = createService();

  service.createNotification({
    recipientId: "user-1",
    type: "new_requirement",
    titleSummary: "R1",
    relatedEntityType: "thread",
    relatedEntityId: "thread-1"
  });
  service.createNotification({
    recipientId: "user-1",
    type: "new_knowledge",
    titleSummary: "K1",
    relatedEntityType: "thread",
    relatedEntityId: "thread-2"
  });

  const firstPage = service.listNotifications("user-1", {
    page: 1,
    pageSize: 1
  });

  assert.equal(firstPage.total, 2);
  assert.equal(firstPage.items.length, 1);

  const unreadOnly = service.listNotifications("user-1", {
    page: 1,
    pageSize: 20,
    isRead: false
  });

  assert.equal(unreadOnly.items.length, 2);
});

test("should_mark_selected_notifications_as_read", () => {
  const service = createService();

  const first = service.createNotification({
    recipientId: "user-1",
    type: "mention",
    titleSummary: "M1",
    relatedEntityType: "thread",
    relatedEntityId: "thread-3"
  });

  service.createNotification({
    recipientId: "user-1",
    type: "task_changed",
    titleSummary: "T1",
    relatedEntityType: "task",
    relatedEntityId: "task-1"
  });

  const marked = service.markRead("user-1", [first.notification_id]);

  assert.equal(marked.marked_count, 1);
  assert.equal(service.getUnreadCount("user-1").count, 1);
});
