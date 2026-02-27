# 工作流 05：私信会话与消息

## 负责范围
- 会话创建/获取
- 消息发送与历史查询
- 会话列表聚合（最后消息、未读数）

## 主要接口
- GET /conversations
- POST /conversations/get-or-create
- GET /conversations/{conv_id}/messages
- POST /conversations/{conv_id}/messages/send

## 数据表
- Conversation
- Message

## 关键规则
- 不能和自己建立会话
- 只有会话参与者能读写消息
- 消息支持 related_task_id（可空）
- 消息发送后要发 MessageCreated 事件给通知/WS 组

## 对外事件
- MessageCreated

## 验收标准
- 游标分页稳定（before + page_size）
- 并发发送不丢消息
- 未读数准确增减
