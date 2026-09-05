import {
  AppointmentRepository,
  UpdateAppointmentRecord,
} from "@/lib/repositories/appointment-repository";

export interface CreateAppointmentInput {
  businessId: string;
  customerId: string;
  startTime: string;
  endTime: string;
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

  async getNextScheduledForCustomer(
    businessId: string,
    customerId: string,
  ) {
    return this.appointments.findNextScheduledForCustomer(
      businessId,
      customerId,
    );
  }

  async hasConflict(
    businessId: string,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    const overlapping =
      await this.appointments.findOverlapping(
        businessId,
        startTime,
        endTime,
      );

    return overlapping !== null;
  }

  async getLatestForCustomer(
    businessId: string,
    customerId: string,
  ) {
    return this.appointments.findByCustomerId(
      businessId,
      customerId,
    );
  }

  async update(
    businessId: string,
    appointmentId: string,
    updates: UpdateAppointmentRecord,
  ) {
    return this.appointments.update(
      businessId,
      appointmentId,
      updates,
    );
  }

  async cancel(
    businessId: string,
    appointmentId: string,
  ) {
    return this.appointments.update(
      businessId,
      appointmentId,
      {
        status: "cancelled",
      },
    );
  }

  async complete(
    businessId: string,
    appointmentId: string,
  ) {
    return this.appointments.update(
      businessId,
      appointmentId,
      {
        status: "completed",
      },
    );
  }
}
