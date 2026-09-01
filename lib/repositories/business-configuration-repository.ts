import { BaseRepository } from "./base-repository";

export interface BusinessConfiguration {
  id: string;
  business_id: string;

  description: string | null;

  services: unknown[];
  products: unknown[];

  business_hours: Record<string, unknown>;
  service_areas: unknown[];

  communication_style: Record<string, unknown>;

  policies: Record<string, unknown>;
  booking_rules: Record<string, unknown>;
  qualification_rules: Record<string, unknown>;

  objectives: unknown[];

  enabled_capabilities: string[];
  approval_required_actions: string[];
  prohibited_actions: string[];

  escalation_rules: Record<string, unknown>;

  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export class BusinessConfigurationRepository extends BaseRepository {
  private readonly TABLE = "business_configurations";

  async getByBusinessId(
    businessId: string,
  ): Promise<BusinessConfiguration | null> {
    const { data, error } = await this.table(this.TABLE)
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) throw error;

    return data as BusinessConfiguration | null;
  }

  async create(
    businessId: string,
    input: Partial<BusinessConfiguration> = {},
  ): Promise<BusinessConfiguration> {
    const { data, error } = await this.table(this.TABLE)
      .insert({
        business_id: businessId,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;

    return data as BusinessConfiguration;
  }

  async update(
    businessId: string,
    updates: Partial<BusinessConfiguration>,
  ): Promise<BusinessConfiguration> {
    const {
      id,
      business_id,
      created_at,
      updated_at,
      ...safeUpdates
    } = updates;

    const { data, error } = await this.table(this.TABLE)
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) throw error;

    return data as BusinessConfiguration;
  }

  async upsert(
    businessId: string,
    input: Partial<BusinessConfiguration>,
  ): Promise<BusinessConfiguration> {
    const {
      id,
      business_id,
      created_at,
      updated_at,
      ...safeInput
    } = input;

    const { data, error } = await this.table(this.TABLE)
      .upsert(
        {
          business_id: businessId,
          ...safeInput,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "business_id",
        },
      )
      .select()
      .single();

    if (error) throw error;

    return data as BusinessConfiguration;
  }
}
