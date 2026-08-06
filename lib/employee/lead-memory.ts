import type {
  ExtractedLeadInformation,
} from "./information-extractor";

export interface LeadMemoryRecord {
  customerId: string;
  source: string;
  qualification: ExtractedLeadInformation;
  updatedAt: string;
}

export class LeadMemory {
  private readonly records = new Map<string, LeadMemoryRecord>();

  public get(customerId: string): LeadMemoryRecord | undefined {
    return this.records.get(customerId);
  }

  public merge(
    customerId: string,
    source: string,
    incoming: ExtractedLeadInformation,
  ): LeadMemoryRecord {
    const existing = this.records.get(customerId);

    const qualification: ExtractedLeadInformation = {
      ...existing?.qualification,
      ...Object.fromEntries(
        Object.entries(incoming).filter(([, value]) => value !== undefined),
      ),
    };

    const record: LeadMemoryRecord = {
      customerId,
      source,
      qualification,
      updatedAt: new Date().toISOString(),
    };

    this.records.set(customerId, record);

    return record;
  }

  public clear(customerId: string): void {
    this.records.delete(customerId);
  }
}