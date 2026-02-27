import type { MessageCreated } from "./message.js";

/**
 * 消息事件发布器实现
 * MVP 阶段使用简单的内存事件总线
 */
export class SimpleMessageEventPublisher {
  private listeners: Array<(event: MessageCreated) => void> = [];

  /**
   * 订阅 MessageCreated 事件
   */
  subscribe(callback: (event: MessageCreated) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 发布 MessageCreated 事件
   */
  publishMessageCreated(event: MessageCreated): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        // 事件处理不应影响主流程
        console.error("Failed to handle MessageCreated event:", error);
      }
    }
  }

  /**
   * 清除所有监听器（用于测试）
   */
  clearListeners(): void {
    this.listeners = [];
  }
}
