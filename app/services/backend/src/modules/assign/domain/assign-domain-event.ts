export type AssignAppliedEvent = {
  name: "AssignApplied";
  occurredAt: string;
  payload: {
    applicationId: string;
    requirementThreadId: string;
    applicantId: string;
  };
};

export type AssignReviewedEvent = {
  name: "AssignReviewed";
  occurredAt: string;
  payload: {
    applicationId: string;
    requirementThreadId: string;
    applicantId: string;
    decision: "approved" | "rejected";
    reviewerId: string;
  };
};

export type AssignWithdrawnEvent = {
  name: "AssignWithdrawn";
  occurredAt: string;
  payload: {
    applicationId: string;
    requirementThreadId: string;
    applicantId: string;
  };
};

export type AssignDomainEvent = AssignAppliedEvent | AssignReviewedEvent | AssignWithdrawnEvent;
