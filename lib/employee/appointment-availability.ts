import { DateTime } from "luxon";

export type BusinessDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface BusinessDayHours {
  open: string;
  close: string;
}

export type BusinessHours = Partial<
  Record<
    BusinessDay,
    BusinessDayHours | null
  >
>;

export interface AvailabilityResult {
  available: boolean;
  reason?: "CLOSED" | "OUTSIDE_HOURS" | "INVALID_CONFIGURATION";
  message?: string;
}

const weekdayNames: Record<
  number,
  BusinessDay
> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
  7: "sunday",
};

function parseClock(
  value: string,
): {
  hour: number;
  minute: number;
} | undefined {
  const match =
    /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return undefined;
  }

  return {
    hour,
    minute,
  };
}

export function checkBusinessHours(
  startTime: string,
  endTime: string,
  timezone: string,
  businessHours: BusinessHours,
): AvailabilityResult {
  const start =
    DateTime.fromISO(startTime, {
      setZone: true,
    }).setZone(timezone);

  const end =
    DateTime.fromISO(endTime, {
      setZone: true,
    }).setZone(timezone);

  if (
    !start.isValid ||
    !end.isValid ||
    end <= start
  ) {
    return {
      available: false,
      reason: "INVALID_CONFIGURATION",
      message:
        "Appointment availability could not be validated.",
    };
  }

  const day =
    weekdayNames[start.weekday];

  const hours =
    businessHours[day];

  if (!hours) {
    return {
      available: false,
      reason: "CLOSED",
      message:
        `The business is closed on ${day}.`,
    };
  }

  const opening =
    parseClock(hours.open);

  const closing =
    parseClock(hours.close);

  if (!opening || !closing) {
    return {
      available: false,
      reason: "INVALID_CONFIGURATION",
      message:
        "Business hours are not configured correctly.",
    };
  }

  const opensAt =
    start.startOf("day").set({
      hour: opening.hour,
      minute: opening.minute,
    });

  const closesAt =
    start.startOf("day").set({
      hour: closing.hour,
      minute: closing.minute,
    });

  if (
    closesAt <= opensAt ||
    !end.hasSame(start, "day")
  ) {
    return {
      available: false,
      reason: "INVALID_CONFIGURATION",
      message:
        "Business hours are not configured correctly.",
    };
  }

  if (
    start < opensAt ||
    end > closesAt
  ) {
    return {
      available: false,
      reason: "OUTSIDE_HOURS",
      message:
        `Appointments on ${day} are available from ${hours.open} to ${hours.close} ${timezone}.`,
    };
  }

  return {
    available: true,
  };
}
