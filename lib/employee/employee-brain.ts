import { EmployeeAction } from "./employee-actions";
import { NormalizedEmployeeEvent } from "./employee-understanding";

export interface EmployeeDecision {
  action: EmployeeAction;

  priority:
    | "low"
    | "normal"
    | "high"
    | "critical";

  reason: string;

  shouldExecute: boolean;
}

export class EmployeeBrain {

  public decideNextAction(
    event: NormalizedEmployeeEvent
  ): EmployeeDecision {

    const message = event.content.toLowerCase();

    if (
      message.includes("estimate") ||
      message.includes("quote")
    ) {
      return {
        action: "REQUEST_ESTIMATE",
        priority: "high",
        reason: "Customer requested an estimate.",
        shouldExecute: true,
      };
    }

    if (
      message.includes("appointment") ||
      message.includes("schedule") ||
      message.includes("book")
    ) {
      return {
        action: "BOOK_APPOINTMENT",
        priority: "high",
        reason: "Customer wants to schedule.",
        shouldExecute: true,
      };
    }

    return {
      action: "RESPOND",
      priority: "normal",
      reason: "Continue the conversation.",
      shouldExecute: true,
    };
  }
}