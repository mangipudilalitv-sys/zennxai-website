import { CustomerRepository } from "@/lib/repositories/customer-repository";

export interface GetOrCreateCustomerInput {
  businessId: string;
  phone?: string;
  name?: string;
  email?: string;
  company?: string;
}

export class CustomerService {
  private readonly customers =
    new CustomerRepository();

  public async getOrCreate(
    input: GetOrCreateCustomerInput,
  ) {
    if (!input.phone) {
      return null;
    }

    const existing =
      await this.customers.findByPhone(
        input.phone,
      );

    if (existing) {
      const updates: Record<
        string,
        unknown
      > = {};

      if (
        input.name &&
        !existing.name
      ) {
        updates.name = input.name;
      }

      if (
        input.email &&
        !existing.email
      ) {
        updates.email = input.email;
      }

      if (
        input.company &&
        !existing.company
      ) {
        updates.company =
          input.company;
      }

      if (
        Object.keys(updates)
          .length > 0
      ) {
        return this.customers.update(
          existing.id,
          updates,
        );
      }

      return existing;
    }

    return this.customers.create({
      business_id:
        input.businessId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      company: input.company,
    });
  }

  public async update(
    id: string,
    updates: Record<string, unknown>,
  ) {
    return this.customers.update(
      id,
      updates,
    );
  }
}