import { supabaseServer } from "@/app/lib/supabase-server";
import type {
  BusinessConfiguration,
} from "@/lib/repositories/business-configuration-repository";

export interface BusinessCommunicationRouting {
  businessId: string;
  twilioPhoneNumber?: string;
  ownerPhoneNumber?: string;
}

export class BusinessCommunicationService {
  private normalizePhone(
    phone?: string | null,
  ): string | undefined {
    if (!phone) {
      return undefined;
    }

    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, "");

    if (!digits) {
      return undefined;
    }

    if (digits.length === 10) {
      return `+1${digits}`;
    }

    if (
      digits.length === 11 &&
      digits.startsWith("1")
    ) {
      return `+${digits}`;
    }

    if (trimmed.startsWith("+")) {
      return `+${digits}`;
    }

    return undefined;
  }

  public async findBusinessByTwilioNumber(
    phone: string,
  ): Promise<BusinessCommunicationRouting | null> {
    const normalized =
      this.normalizePhone(phone);

    if (!normalized) {
      return null;
    }

    /*
     * V1 routing lives in business_configurations.metadata.
     *
     * We intentionally query through the trusted server client:
     * inbound Twilio webhooks are server-side infrastructure and
     * business_configurations is RLS protected from public clients.
     */
    const { data, error } =
      await supabaseServer
        .from("business_configurations")
        .select("business_id, metadata");

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const metadata =
        row.metadata &&
        typeof row.metadata === "object" &&
        !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};

      const configuredTwilio =
        typeof metadata.twilioPhoneNumber === "string"
          ? this.normalizePhone(
              metadata.twilioPhoneNumber,
            )
          : undefined;

      if (configuredTwilio === normalized) {
        return {
          businessId: row.business_id,
          twilioPhoneNumber:
            configuredTwilio,
          ownerPhoneNumber:
            typeof metadata.ownerPhoneNumber ===
            "string"
              ? this.normalizePhone(
                  metadata.ownerPhoneNumber,
                )
              : undefined,
        };
      }
    }

    /*
     * Single-tenant development compatibility.
     *
     * This fallback is ONLY valid when the inbound number is
     * exactly the configured ZennX Twilio number.
     */
    const defaultBusinessId =
      process.env.DEFAULT_BUSINESS_ID;

    const defaultTwilio =
      this.normalizePhone(
        process.env.TWILIO_PHONE_NUMBER,
      );

    if (
      defaultBusinessId &&
      defaultTwilio === normalized
    ) {
      return {
        businessId:
          defaultBusinessId,
        twilioPhoneNumber:
          defaultTwilio,
        ownerPhoneNumber:
          this.normalizePhone(
            process.env.OWNER_PHONE_NUMBER,
          ),
      };
    }

    return null;
  }

  public async getByBusinessId(
    businessId: string,
  ): Promise<BusinessCommunicationRouting | null> {
    const { data, error } =
      await supabaseServer
        .from("business_configurations")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    const defaultBusinessId =
      process.env.DEFAULT_BUSINESS_ID;

    const isDefaultBusiness =
      Boolean(defaultBusinessId) &&
      businessId === defaultBusinessId;

    if (!data) {
      if (!isDefaultBusiness) {
        return null;
      }

      return {
        businessId,
        twilioPhoneNumber:
          this.normalizePhone(
            process.env.TWILIO_PHONE_NUMBER,
          ),
        ownerPhoneNumber:
          this.normalizePhone(
            process.env.OWNER_PHONE_NUMBER,
          ),
      };
    }

    const configuration =
      data as BusinessConfiguration;

    const metadata =
      configuration.metadata &&
      typeof configuration.metadata === "object" &&
      !Array.isArray(configuration.metadata)
        ? configuration.metadata
        : {};

    const configuredTwilio =
      typeof metadata.twilioPhoneNumber === "string"
        ? this.normalizePhone(
            metadata.twilioPhoneNumber,
          )
        : undefined;

    const configuredOwner =
      typeof metadata.ownerPhoneNumber === "string"
        ? this.normalizePhone(
            metadata.ownerPhoneNumber,
          )
        : undefined;

    return {
      businessId,
      twilioPhoneNumber:
        configuredTwilio ??
        (isDefaultBusiness
          ? this.normalizePhone(
              process.env.TWILIO_PHONE_NUMBER,
            )
          : undefined),
      ownerPhoneNumber:
        configuredOwner ??
        (isDefaultBusiness
          ? this.normalizePhone(
              process.env.OWNER_PHONE_NUMBER,
            )
          : undefined),
    };
  }
}
