export const TaskErrorCode = {
  InvalidStatusTransition: "task.invalid_status_transition",
  NotAssignee: "task.not_assignee"
} as const;

export type TaskErrorCodeValue = (typeof TaskErrorCode)[keyof typeof TaskErrorCode];
