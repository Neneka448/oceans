import type { TopTaskReadRepository, TopTaskSummary } from "../../assign/application/assign-query-service.js";
import type { TaskRepository } from "../application/task-repository.js";
import type { Task } from "../domain/task.js";

export class TaskMemoryRepository implements TaskRepository, TopTaskReadRepository {
  private readonly tasks = new Map<string, Task>();

  save(task: Task): void {
    this.tasks.set(task.id, task);
  }

  findById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  listByRequirementThreadId(requirementThreadId: string): Task[] {
    return [...this.tasks.values()]
      .filter((task) => task.requirementThreadId === requirementThreadId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  listByParentTaskId(parentTaskId: string): Task[] {
    return [...this.tasks.values()]
      .filter((task) => task.parentTaskId === parentTaskId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  listTopByRequirementThreadId(requirementThreadId: string): TopTaskSummary[] {
    return this.listByRequirementThreadId(requirementThreadId)
      .filter((task) => task.parentTaskId === null)
      .map((task) => ({
        taskId: task.id,
        assigneeId: task.assigneeId,
        assigneeName: task.assigneeId,
        status: task.status,
        progressSummary: task.progressSummary
      }));
  }
}
