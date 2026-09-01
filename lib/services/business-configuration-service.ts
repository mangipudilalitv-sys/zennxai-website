import {
  BusinessConfiguration,
  BusinessConfigurationRepository,
} from "@/lib/repositories/business-configuration-repository";

export class BusinessConfigurationService {
  private readonly repository =
    new BusinessConfigurationRepository();

  async get(
    businessId: string,
  ): Promise<BusinessConfiguration | null> {
    return this.repository.getByBusinessId(businessId);
  }

  async getOrCreate(
    businessId: string,
  ): Promise<BusinessConfiguration> {
    const existing =
      await this.repository.getByBusinessId(businessId);

    if (existing) {
      return existing;
    }

    return this.repository.create(businessId);
  }

  async update(
    businessId: string,
    updates: Partial<BusinessConfiguration>,
  ): Promise<BusinessConfiguration> {
    return this.repository.update(
      businessId,
      updates,
    );
  }

  async upsert(
    businessId: string,
    configuration: Partial<BusinessConfiguration>,
  ): Promise<BusinessConfiguration> {
    return this.repository.upsert(
      businessId,
      configuration,
    );
  }

  async canExecute(
    businessId: string,
    action: string,
  ): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    reason?: string;
  }> {
    const config =
      await this.repository.getByBusinessId(businessId);

    if (!config) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: "Business configuration not found.",
      };
    }

    if (config.prohibited_actions.includes(action)) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: "Action is prohibited for this business.",
      };
    }

    if (
      config.approval_required_actions.includes(action)
    ) {
      return {
        allowed: true,
        requiresApproval: true,
      };
    }

    if (
      config.enabled_capabilities.length > 0 &&
      !config.enabled_capabilities.includes(action)
    ) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: "Capability is not enabled for this business.",
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
    };
  }
}
