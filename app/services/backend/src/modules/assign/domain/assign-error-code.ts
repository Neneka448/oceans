export const AssignErrorCode = {
  AlreadyApplied: "assign.already_applied",
  NotPending: "assign.not_pending",
  NotWithdrawable: "assign.not_withdrawable",
  NotApproved: "assign.not_approved"
} as const;

export type AssignErrorCodeValue = (typeof AssignErrorCode)[keyof typeof AssignErrorCode];
