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
      await this.customers.findByBusinessAndPhone(
        input.businessId,
        input.phone,
      );

    if (existing) {
      const updates: {
        name?: string;
        email?: string;
        company?: string;
      } = {};

      if (input.name && !existing.name) {
        updates.name = input.name;
      }

      if (input.email && !existing.email) {
        updates.email = input.email;
      }

      if (
        input.company &&
        !existing.company
      ) {
        updates.company = input.company;
      }

      if (Object.keys(updates).length > 0) {
        return this.customers.update(
          input.businessId,
          existing.id,
          updates,
        );
      }

      return existing;
    }

    try {
      return await this.customers.create({
        business_id: input.businessId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        company: input.company,
      });
    } catch (error: unknown) {
      /*
       * Two concurrent requests for the same
       * (business_id, phone) may race.
       *
       * The database unique index is the source of truth.
       * If another request created the customer first,
       * resolve and return that durable identity.
       */
      const duplicate =
        await this.customers.findByBusinessAndPhone(
          input.businessId,
          input.phone,
        );

      if (duplicate) {
        return duplicate;
      }

      throw error;
    }
  }

  public async update(
    businessId: string,
    id: string,
    updates: {
      name?: string;
      phone?: string;
      email?: string;
      company?: string;
    },
  ) {
    return this.customers.update(
      businessId,
      id,
      updates,
    );
  }
}
