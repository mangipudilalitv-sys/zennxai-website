import * as chrono from "chrono-node";
import { DateTime } from "luxon";

export interface BookingTimeResult {
  startTime: string;
  endTime: string;
  timezone: string;
  originalText: string;
}

export interface ParseBookingTimeInput {
  preferredTime: string;
  timezone: string;
  durationMinutes?: number;
  referenceDate?: Date;
}

function fallbackHour(
  value: string,
): number | undefined {
  if (/\bmorning\b/i.test(value)) return 9;
  if (/\bafternoon\b/i.test(value)) return 14;
  if (/\bevening\b/i.test(value)) return 17;

  return undefined;
}

export function parseBookingTime(
  input: ParseBookingTimeInput,
): BookingTimeResult | undefined {
  const value =
    input.preferredTime.trim();

  if (!value) return undefined;

  const durationMinutes =
    input.durationMinutes ?? 60;

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 24 * 60
  ) {
    return undefined;
  }

  const referenceDate =
    input.referenceDate ?? new Date();

  const zonedReference =
    DateTime.fromJSDate(
      referenceDate,
    ).setZone(input.timezone);

  if (!zonedReference.isValid) {
    return undefined;
  }

  let start: DateTime | undefined;

  if (
    /^\d{4}-\d{2}-\d{2}T/.test(value)
  ) {
    const hasExplicitOffset =
      /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);

    const parsedIso =
      DateTime.fromISO(
        value,
        hasExplicitOffset
          ? { setZone: true }
          : { zone: input.timezone },
      );

    if (parsedIso.isValid) {
      start =
        parsedIso.setZone(
          input.timezone,
        );
    }
  } else {
    const results =
      chrono.en.casual.parse(
        value,
        {
          instant: referenceDate,
          timezone:
            zonedReference.offset,
        },
        {
          forwardDate: true,
        },
      );

    const result =
      results[0];

    if (!result) {
      return undefined;
    }

    const hour =
      result.start.isCertain("hour")
        ? result.start.get("hour")
        : fallbackHour(value);

    if (
      hour === undefined ||
      hour === null
    ) {
      return undefined;
    }

    const year =
      result.start.get("year");

    const month =
      result.start.get("month");

    const day =
      result.start.get("day");

    if (
      year === null ||
      month === null ||
      day === null
    ) {
      return undefined;
    }

    start =
      DateTime.fromObject(
        {
          year,
          month,
          day,
          hour,
          minute:
            result.start.get("minute") ?? 0,
          second: 0,
          millisecond: 0,
        },
        {
          zone: input.timezone,
        },
      );
  }

  if (
    !start?.isValid ||
    start.toMillis() <=
      referenceDate.getTime()
  ) {
    return undefined;
  }

  const end =
    start.plus({
      minutes: durationMinutes,
    });

  return {
    startTime:
      start.toUTC().toISO()!,
    endTime:
      end.toUTC().toISO()!,
    timezone:
      input.timezone,
    originalText:
      input.preferredTime,
  };
}
