import type { EmployeeAction } from "./employee-actions";
import type { NormalizedEmployeeEvent } from "./employee-understanding";

export interface EmployeeDecision {
  action: EmployeeAction;
  priority: "low" | "normal" | "high" | "critical";
  reason: string;
  shouldExecute: boolean;
}

const estimateRequestPatterns = [
  /\bestimate\b/i,
  /\bquote\b/i,
  /\bhow much\b/i,
  /\bprice\b/i,
  /\bcost\b/i,
  /\breplacement\b/i,
  /\brepair\b/i,
  /\binspection\b/i,
  /\bleak\b/i,
  /\broof\b/i,
  /\bgutter\b/i,
  /\bhvac\b/i,
  /\bair conditioning\b/i,
  /\bplumb(?:er|ing)?\b/i,
  /\belectric(?:al|ian)?\b/i,
];

const appointmentPatterns = [
  /\bappointment\b/i,
  /\bschedule\b/i,
  /\bbook\b/i,
  /\bavailability\b/i,
  /\bcome out\b/i,
  /\bvisit\b/i,
];

export class EmployeeBrain {
  public decideNextAction(
    event: NormalizedEmployeeEvent,
  ): EmployeeDecision {
    const message = event.content.trim();

    if (appointmentPatterns.some((pattern) => pattern.test(message))) {
      return {
        action: "BOOK_APPOINTMENT",
        priority: "high",
        reason: "Customer requested scheduling or availability.",
        shouldExecute: true,
      };
    }

    if (estimateRequestPatterns.some((pattern) => pattern.test(message))) {
      return {
        action: "REQUEST_ESTIMATE",
        priority: "high",
        reason: "Customer described a service or estimate request.",
        shouldExecute: true,
      };
    }

    return {
      action: "RESPOND",
      priority: "normal",
      reason: "No actionable service request was identified yet.",
      shouldExecute: true,
    };
  }
}