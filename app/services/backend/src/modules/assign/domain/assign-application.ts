import { randomUUID } from "node:crypto";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import { AssignErrorCode, type AssignErrorCodeValue } from "./assign-error-code.js";

export type AssignApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type AssignReviewDecision = "approved" | "rejected";

export type AssignApplicationSnapshot = {
  id: string;
  requirementThreadId: string;
  applicantId: string;
  reasonSummary: string;
  status: AssignApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

const assignAppError = (code: AssignErrorCodeValue, message: string, statusCode: number): AppError =>
  new AppError(code as ErrorCode, message, statusCode);

export class AssignApplication {
  private constructor(private readonly snapshot: AssignApplicationSnapshot) {}

  static create(input: {
    requirementThreadId: string;
    applicantId: string;
    reasonSummary: string;
    now: string;
  }): AssignApplication {
    return new AssignApplication({
      id: randomUUID(),
      requirementThreadId: input.requirementThreadId,
      applicantId: input.applicantId,
      reasonSummary: input.reasonSummary,
      status: "pending",
      createdAt: input.now,
      updatedAt: input.now
    });
  }

  static rehydrate(snapshot: AssignApplicationSnapshot): AssignApplication {
    return new AssignApplication({ ...snapshot });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get requirementThreadId(): string {
    return this.snapshot.requirementThreadId;
  }

  get applicantId(): string {
    return this.snapshot.applicantId;
  }

  get reasonSummary(): string {
    return this.snapshot.reasonSummary;
  }

  get status(): AssignApplicationStatus {
    return this.snapshot.status;
  }

  get createdAt(): string {
    return this.snapshot.createdAt;
  }

  review(decision: AssignReviewDecision, now: string): void {
    if (this.snapshot.status !== "pending") {
      throw assignAppError(AssignErrorCode.NotPending, "application is not pending", 409);
    }

    this.snapshot.status = decision;
    this.snapshot.updatedAt = now;
  }

  withdraw(now: string): void {
    if (this.snapshot.status !== "pending" && this.snapshot.status !== "approved") {
      throw assignAppError(AssignErrorCode.NotWithdrawable, "application is not withdrawable", 409);
    }

    this.snapshot.status = "withdrawn";
    this.snapshot.updatedAt = now;
  }

  toSnapshot(): AssignApplicationSnapshot {
    return { ...this.snapshot };
  }
}
