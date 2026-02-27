import type { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import { AuditService } from "../../application/audit-service.js";
import { AuditMemoryRepository } from "../../infra/audit-memory-repository.js";

// 单例仓储和服务实例
const auditRepository = new AuditMemoryRepository();
export const auditService = new AuditService(auditRepository);

// 请求体验证类型
interface SubmitAuditBody {
  summary?: string;
  related_entity_type?: "thread" | "task";
  related_entity_id?: string;
  tool_calls?: Array<{
    seq?: number;
    tool_name?: string;
    input_params?: unknown;
    return_value?: unknown;
  }>;
}

interface ListAuditQuery {
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  from?: string;
  to?: string;
  page?: string;
  page_size?: string;
}

// 权限检查辅助函数（简化版，实际应与 Auth 模块集成）
function getCurrentUserId(request: FastifyRequest): string | null {
  // 从请求头或 JWT 中提取用户 ID
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;

  // 简化处理：实际应该从 JWT token 中解析
  // 这里使用一个模拟的用户 ID 供开发测试
  return (request as unknown as { user?: { id: string } }).user?.id ?? null;
}

export const auditRoutes: HttpRouteModule = async (app) => {
  /**
   * POST /audit/submit
   * 提交 Audit 条目
   */
  app.post("/submit", async (request: FastifyRequest<{ Body: SubmitAuditBody }>, reply: FastifyReply) => {
    const userId = getCurrentUserId(request);
    if (!userId) {
      throw new AppError(ErrorCode.Unauthorized, "Authentication required", 401);
    }

    const body = request.body;

    // 参数校验
    if (!body.summary || typeof body.summary !== "string" || body.summary.trim().length === 0) {
      throw new AppError(ErrorCode.InvalidParams, "summary is required and must be a non-empty string", 400, {
        field: "summary"
      });
    }

    if (!body.tool_calls || !Array.isArray(body.tool_calls) || body.tool_calls.length === 0) {
      throw new AppError(ErrorCode.InvalidParams, "tool_calls is required and must be a non-empty array", 400, {
        field: "tool_calls"
      });
    }

    // 校验 tool_calls 格式
    const toolCalls = body.tool_calls.map((tc, index) => {
      if (typeof tc.seq !== "number" || tc.seq < 1) {
        throw new AppError(ErrorCode.InvalidParams, `tool_calls[${index}].seq must be a positive integer`, 400, {
          field: `tool_calls[${index}].seq`
        });
      }
      if (!tc.tool_name || typeof tc.tool_name !== "string") {
        throw new AppError(ErrorCode.InvalidParams, `tool_calls[${index}].tool_name is required`, 400, {
          field: `tool_calls[${index}].tool_name`
        });
      }
      return {
        seq: tc.seq,
        toolName: tc.tool_name,
        inputParams: tc.input_params ?? {},
        returnValue: tc.return_value ?? {}
      };
    });

    // 校验 related_entity_type 和 related_entity_id 的关联关系
    if (body.related_entity_type && !body.related_entity_id) {
      throw new AppError(
        ErrorCode.InvalidParams,
        "related_entity_id is required when related_entity_type is provided",
        400,
        { field: "related_entity_id" }
      );
    }

    if (body.related_entity_id && !body.related_entity_type) {
      throw new AppError(
        ErrorCode.InvalidParams,
        "related_entity_type is required when related_entity_id is provided",
        400,
        { field: "related_entity_type" }
      );
    }

    const result = await auditService.submitAudit({
      userId,
      summary: body.summary.trim(),
      relatedEntityType: body.related_entity_type,
      relatedEntityId: body.related_entity_id,
      toolCalls
    });

    reply.status(200);
    return ok({ entry_id: result.entryId });
  });

  /**
   * GET /audit
   * 查询 Audit 列表
   */
  app.get("/", async (request: FastifyRequest<{ Querystring: ListAuditQuery }>, reply: FastifyReply) => {
    const query = request.query;

    // 解析分页参数
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.page_size ?? "20", 10) || 20));

    // 解析时间范围
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (query.from) {
      fromDate = new Date(query.from);
      if (isNaN(fromDate.getTime())) {
        throw new AppError(ErrorCode.InvalidParams, "Invalid 'from' date format, expected ISO 8601", 400, {
          field: "from"
        });
      }
    }

    if (query.to) {
      toDate = new Date(query.to);
      if (isNaN(toDate.getTime())) {
        throw new AppError(ErrorCode.InvalidParams, "Invalid 'to' date format, expected ISO 8601", 400, {
          field: "to"
        });
      }
    }

    // 验证 entity_type 的有效性
    if (query.entity_type && query.entity_type !== "thread" && query.entity_type !== "task") {
      throw new AppError(ErrorCode.InvalidParams, "entity_type must be 'thread' or 'task'", 400, {
        field: "entity_type"
      });
    }

    const result = await auditService.listAuditEntries(
      {
        userId: query.user_id,
        entityType: query.entity_type,
        entityId: query.entity_id,
        from: fromDate,
        to: toDate
      },
      page,
      pageSize
    );

    reply.status(200);
    return ok({
      items: result.items.map((item) => ({
        entry_id: item.entryId,
        user_id: item.userId,
        summary: item.summary,
        related_entity_type: item.relatedEntityType,
        related_entity_id: item.relatedEntityId,
        created_at: item.createdAt
      })),
      total: result.total,
      page: result.page,
      page_size: result.pageSize
    });
  });

  /**
   * GET /audit/:entry_id
   * 查看 Audit 详情
   */
  app.get("/:entry_id", async (request: FastifyRequest<{ Params: { entry_id: string } }>, reply: FastifyReply) => {
    const { entry_id } = request.params;

    if (!entry_id) {
      throw new AppError(ErrorCode.InvalidParams, "entry_id is required", 400);
    }

    const entry = await auditService.getAuditEntry(entry_id);

    if (!entry) {
      throw new AppError(ErrorCode.NotFound, `Audit entry not found: ${entry_id}`, 404);
    }

    reply.status(200);
    return ok({
      entry_id: entry.entryId,
      user_id: entry.userId,
      summary: entry.summary,
      related_entity_type: entry.relatedEntityType,
      related_entity_id: entry.relatedEntityId,
      tool_calls: entry.toolCalls.map((tc) => ({
        seq: tc.seq,
        tool_name: tc.toolName,
        input_params: tc.inputParams,
        return_value: tc.returnValue
      })),
      created_at: entry.createdAt
    });
  });
};
