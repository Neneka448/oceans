import { requirementParticipantRepository } from "../../assign/infra/assign-singletons.js";
import { TaskService } from "../application/task-service.js";
import { InMemoryTaskEventPublisher } from "./in-memory-task-event-publisher.js";
import { TaskMemoryRepository } from "./task-memory-repository.js";

export const taskRepository = new TaskMemoryRepository();
export const taskEventPublisher = new InMemoryTaskEventPublisher();

export const taskService = new TaskService({
  taskRepository,
  requirementParticipantRepository,
  eventPublisher: taskEventPublisher
});
