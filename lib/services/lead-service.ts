import { LeadRepository } from "@/lib/repositories/lead-repository";

export class LeadService {
  private readonly leads =
    new LeadRepository();

  async create(input: {
    businessId: string;
    customerId: string;
    source: string;
    summary: string;
    qualification: unknown;
  }) {
    return this.leads.create({
      business_id: input.businessId,
      customer_id: input.customerId,
      status: "QUALIFYING",
      source: input.source,
      summary: input.summary,
      qualification: input.qualification,
    });
  }

  async getLatest(
    customerId: string,
  ) {
    return this.leads.findByCustomerId(
      customerId,
    );
  }

  async update(
    id: string,
    updates: Record<string, unknown>,
  ) {
    return this.leads.update(
      id,
      updates,
    );
  }
}