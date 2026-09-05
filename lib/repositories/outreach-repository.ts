import { BaseRepository } from "./base-repository";

export type OutreachContactType =
  | "business"
  | "creator"
  | "brand"
  | "founder"
  | "agency"
  | "investor"
  | "partner"
  | "other";

export type OutreachChannel =
  | "instagram"
  | "linkedin"
  | "x"
  | "email"
  | "sms"
  | "other";

export type OutreachObjective =
  | "SELL"
  | "NETWORK"
  | "COLLABORATE"
  | "PARTNERSHIP"
  | "INVESTOR"
  | "REFERRAL";

export type OutreachMessageStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "sent"
  | "delivered"
  | "replied"
  | "failed";

export interface CreateOutreachContactRecord {
  business_id: string;
  contact_type: OutreachContactType;
  display_name: string;
  platform: OutreachChannel;
  organization_name?: string;
  handle?: string;
  profile_url?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  audience_size?: number;
  source?: string;
  tags?: string[];
  personalization?: Record<string, unknown>;
}

export interface CreateOutreachCampaignRecord {
  business_id: string;
  name: string;
  objective: OutreachObjective;
  channel: OutreachChannel;
  target_type?: string;
  instructions?: string;
  daily_limit?: number;
}

export interface CreateOutreachMessageRecord {
  business_id: string;
  contact_id: string;
  channel: OutreachChannel;
  body: string;
  campaign_id?: string;
  parent_message_id?: string;
  personalization_context?: Record<string, unknown>;
  requires_approval?: boolean;
  status?: OutreachMessageStatus;
}

export class OutreachRepository extends BaseRepository {
  async createContact(
    input: CreateOutreachContactRecord,
  ) {
    const { data, error } =
      await this.table("outreach_contacts")
        .insert(input)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createCampaign(
    input: CreateOutreachCampaignRecord,
  ) {
    const { data, error } =
      await this.table("outreach_campaigns")
        .insert(input)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async createMessage(
    input: CreateOutreachMessageRecord,
  ) {
    const { data, error } =
      await this.table("outreach_messages")
        .insert(input)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async findMessage(
    businessId: string,
    messageId: string,
  ) {
    const { data, error } =
      await this.table("outreach_messages")
        .select("*")
        .eq("business_id", businessId)
        .eq("id", messageId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateMessage(
    businessId: string,
    messageId: string,
    updates: Record<string, unknown>,
  ) {
    const { data, error } =
      await this.table("outreach_messages")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId)
        .eq("id", messageId)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async listPendingApprovals(
    businessId: string,
  ) {
    const { data, error } =
      await this.table("outreach_messages")
        .select(
          "*, outreach_contacts(display_name, organization_name, platform, handle)",
        )
        .eq("business_id", businessId)
        .eq("status", "pending_approval")
        .order("created_at", {
          ascending: true,
        });

    if (error) {
      throw error;
    }

    return data ?? [];
  }
}
