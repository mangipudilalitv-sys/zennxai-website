export type AppointmentLifecycleIntent =
  | "CANCEL_APPOINTMENT"
  | "RESCHEDULE_APPOINTMENT";

export function detectAppointmentLifecycleIntent(
  message: string,
): AppointmentLifecycleIntent | undefined {
  const normalized =
    message
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  if (!normalized) {
    return undefined;
  }

  const mentionsAppointment =
    /\bappointment\b|\bbooking\b|\bvisit\b/.test(
      normalized,
    );

  if (
    mentionsAppointment &&
    /\b(reschedule|rebook|move|change)\b/.test(
      normalized,
    )
  ) {
    return "RESCHEDULE_APPOINTMENT";
  }

  if (
    mentionsAppointment &&
    /\b(cancel|cancellation|cancelled|canceled)\b/.test(
      normalized,
    )
  ) {
    return "CANCEL_APPOINTMENT";
  }

  return undefined;
}
