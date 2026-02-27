/**
 * DomainKnowledgeItem 领域实体
 * 领域知识条目，由 reply_accepted 或 task_completed 事件自动触发创建
 */

export type SourceEventType = "reply_accepted" | "task_completed";

export interface DomainKnowledgeItemProps {
  id: string;
  userId: string;
  content: string;
  sourceEventType: SourceEventType;
  sourceEntityId: string;
  createdAt: Date;
}

export class DomainKnowledgeItem {
  readonly id: string;
  readonly userId: string;
  readonly content: string;
  readonly sourceEventType: SourceEventType;
  readonly sourceEntityId: string;
  readonly createdAt: Date;

  constructor(props: DomainKnowledgeItemProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.content = props.content;
    this.sourceEventType = props.sourceEventType;
    this.sourceEntityId = props.sourceEntityId;
    this.createdAt = props.createdAt;
  }

  static create(
    id: string,
    userId: string,
    content: string,
    sourceEventType: string,
    sourceEntityId: string
  ): DomainKnowledgeItem {
    // 验证 source_event_type 的有效性
    if (sourceEventType !== "reply_accepted" && sourceEventType !== "task_completed") {
      throw new Error(`Invalid source_event_type: ${sourceEventType}, must be 'reply_accepted' or 'task_completed'`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    return new DomainKnowledgeItem({
      id,
      userId,
      content: content.trim(),
      sourceEventType,
      sourceEntityId,
      createdAt: new Date()
    });
  }
}

/**
 * DomainKnowledgeItemCreated 领域事件
 */
export interface DomainKnowledgeItemCreatedEvent {
  name: "knowledge.item_created";
  payload: {
    knowledgeId: string;
    userId: string;
    content: string;
    sourceEventType: SourceEventType;
    sourceEntityId: string;
    createdAt: string;
  };
}
