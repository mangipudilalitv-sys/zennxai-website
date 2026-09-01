import { AppointmentRepository } from "@/lib/repositories/appointment-repository";

export interface CreateAppointmentInput {
  businessId: string;
  customerId: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

export class AppointmentService {
  private readonly appointments =
    new AppointmentRepository();

  async create(
    input: CreateAppointmentInput,
  ) {
    return this.appointments.create({
      business_id: input.businessId,
      customer_id: input.customerId,
      start_time: input.startTime,
      end_time: input.endTime,
      status: "scheduled",
      notes: input.notes,
    });
  }

  async getLatestForCustomer(
    customerId: string,
  ) {
    return this.appointments.findByCustomerId(
      customerId,
    );
  }

  async update(
    appointmentId: string,
    updates: Record<string, unknown>,
  ) {
    return this.appointments.update(
      appointmentId,
      updates,
    );
  }

  async cancel(
    appointmentId: string,
  ) {
    return this.appointments.update(
      appointmentId,
      {
        status: "cancelled",
      },
    );
  }

  async complete(
    appointmentId: string,
  ) {
    return this.appointments.update(
      appointmentId,
      {
        status: "completed",
      },
    );
  }
}
