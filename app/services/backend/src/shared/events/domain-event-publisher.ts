import type { MessageCreated } from "../../modules/message/domain/message.js";

/**
 * 领域事件发布者接口
 * 用于发布领域事件，通知其他模块
 */
export interface DomainEventPublisher {
  publishMessageCreated(event: MessageCreated): void;
}

/**
 * 简单的内存领域事件发布者实现
 * MVP 阶段使用，后续可以替换为消息队列实现
 */
export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private messageCreatedHandlers: Array<(event: MessageCreated) => void> = [];

  /**
   * 注册 MessageCreated 事件处理器
   */
  onMessageCreated(handler: (event: MessageCreated) => void): void {
    this.messageCreatedHandlers.push(handler);
  }

  /**
   * 发布 MessageCreated 事件
   */
  publishMessageCreated(event: MessageCreated): void {
    for (const handler of this.messageCreatedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("Error handling MessageCreated event:", error);
      }
    }
  }

  /**
   * 清除所有处理器（用于测试）
   */
  clear(): void {
    this.messageCreatedHandlers = [];
  }
}
