export type EventSource =
  | "phone"
  | "sms"
  | "email"
  | "web_form"
  | "owner";

export interface NormalizedEmployeeEvent {
  source: EventSource;

  customerId?: string;

  content: string;

  timestamp: Date;

  metadata?: Record<string, unknown>;
}

export class EmployeeUnderstanding {
  public normalize(
    event: NormalizedEmployeeEvent
  ): NormalizedEmployeeEvent {

    return event;

  }
}