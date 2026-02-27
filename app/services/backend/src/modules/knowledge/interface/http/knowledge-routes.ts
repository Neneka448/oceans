import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import { KnowledgeService } from "../../application/knowledge-service.js";
import { KnowledgeMemoryRepository } from "../../infra/knowledge-memory-repository.js";

// 单例仓储和服务实例
const knowledgeRepository = new KnowledgeMemoryRepository();
export const knowledgeService = new KnowledgeService(knowledgeRepository);

// 请求体验证类型
interface ListKnowledgeQuery {
  page?: string;
  page_size?: string;
}

interface KnowledgeParams {
  user_id: string;
}

export const knowledgeRoutes: HttpRouteModule = async (app) => {
  /**
   * GET /users/:user_id/domain-knowledge
   * 查看用户领域知识
   */
  app.get("/", async (request: FastifyRequest<{ Params: KnowledgeParams; Querystring: ListKnowledgeQuery }>) => {
    const { user_id } = request.params;

    if (!user_id) {
      throw new AppError(ErrorCode.InvalidParams, "user_id is required", 400);
    }

    // 解析分页参数
    const query = request.query;
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.page_size ?? "20", 10) || 20));

    const result = await knowledgeService.getUserKnowledge(user_id, page, pageSize);

    return ok({
      items: result.items.map((item) => ({
        knowledge_id: item.knowledgeId,
        content: item.content,
        source_event_type: item.sourceEventType,
        source_entity_id: item.sourceEntityId,
        created_at: item.createdAt
      })),
      total: result.total,
      page: result.page,
      page_size: result.pageSize
    });
  });
};
