import type { Task } from "../domain/task.js";

export interface TaskRepository {
  save(task: Task): void;
  findById(taskId: string): Task | undefined;
  listByRequirementThreadId(requirementThreadId: string): Task[];
  listByParentTaskId(parentTaskId: string): Task[];
}
