import { supabaseServer } from "@/app/lib/supabase-server";

export type SmsConsentStatus =
  | "subscribed"
  | "unsubscribed";

export class SmsConsentService {
  private normalizePhone(
    phone: string,
  ): string | undefined {
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, "");

    if (!digits) return undefined;

    if (digits.length === 10) {
      return `+1${digits}`;
    }

    if (
      digits.length === 11 &&
      digits.startsWith("1")
    ) {
      return `+${digits}`;
    }

    if (trimmed.startsWith("+") && digits.length >= 10) {
      return `+${digits}`;
    }

    return undefined;
  }

  public async getStatus(
    businessId: string,
    phone: string,
  ): Promise<SmsConsentStatus | null> {
    const normalized =
      this.normalizePhone(phone);

    if (!normalized) {
      return null;
    }

    const { data, error } =
      await supabaseServer
        .from("sms_consents")
        .select("status")
        .eq("business_id", businessId)
        .eq("phone", normalized)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.status ?? null;
  }

  public async canSend(
    businessId: string,
    phone: string,
  ): Promise<boolean> {
    const status =
      await this.getStatus(
        businessId,
        phone,
      );

    /*
     * No consent row means no STOP has been recorded yet.
     * V1 allows transactional/follow-up messaging unless
     * the customer has explicitly unsubscribed.
     */
    return status !== "unsubscribed";
  }

  public async unsubscribe(
    businessId: string,
    phone: string,
    source = "sms_keyword",
  ) {
    const normalized =
      this.normalizePhone(phone);

    if (!normalized) {
      throw new Error(
        "Invalid SMS consent phone number.",
      );
    }

    const now =
      new Date().toISOString();

    const { data, error } =
      await supabaseServer
        .from("sms_consents")
        .upsert(
          {
            business_id: businessId,
            phone: normalized,
            status: "unsubscribed",
            source,
            opted_out_at: now,
            opted_in_at: null,
            updated_at: now,
          },
          {
            onConflict:
              "business_id,phone",
          },
        )
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  public async subscribe(
    businessId: string,
    phone: string,
    source = "sms_keyword",
  ) {
    const normalized =
      this.normalizePhone(phone);

    if (!normalized) {
      throw new Error(
        "Invalid SMS consent phone number.",
      );
    }

    const now =
      new Date().toISOString();

    const { data, error } =
      await supabaseServer
        .from("sms_consents")
        .upsert(
          {
            business_id: businessId,
            phone: normalized,
            status: "subscribed",
            source,
            opted_in_at: now,
            opted_out_at: null,
            updated_at: now,
          },
          {
            onConflict:
              "business_id,phone",
          },
        )
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
