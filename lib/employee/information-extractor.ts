export type LeadUrgency = "low" | "normal" | "high" | "critical";

export interface ExtractedLeadInformation {
  name?: string;
  phone?: string;
  serviceType?: string;
  location?: string;
  urgency?: LeadUrgency;
  preferredTime?: string;
}

function cleanValue(value?: string): string | undefined {
  const cleaned = value
    ?.trim()
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ");

  return cleaned || undefined;
}

export class InformationExtractor {
  public extract(content: string): ExtractedLeadInformation {
    const text = content.trim();
    const lower = text.toLowerCase();

    return {
      name: this.extractName(text),
      phone: this.extractPhone(text),
      serviceType: this.extractServiceType(lower),
      location: this.extractLocation(text),
      urgency: this.extractUrgency(lower),
      preferredTime: this.extractPreferredTime(text),
    };
  }

  private extractName(content: string): string | undefined {
    const match = content.match(
      /\b(?:my name is|i am|i'm|this is)\s+([a-z][a-z'-]{1,30})\b/i,
    );

    if (!match?.[1]) {
      return undefined;
    }

    const name = cleanValue(match[1]);

    return name
      ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
      : undefined;
  }

  private extractPhone(content: string): string | undefined {
    const match = content.match(
      /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
    );

    if (!match?.[0]) {
      return undefined;
    }

    const digits = match[0].replace(/\D/g, "");

    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.slice(1);
    }

    return digits.length === 10 ? digits : undefined;
  }

  private extractServiceType(content: string): string | undefined {
    const services: Array<[RegExp, string]> = [
      [/\broof replacement\b/, "roof replacement"],
      [/\broof repair\b/, "roof repair"],
      [/\broof inspection\b/, "roof inspection"],
      [/\bleak repair\b|\bleaking roof\b|\broof leak\b/, "roof leak repair"],
      [/\bgutter replacement\b/, "gutter replacement"],
      [/\bgutter repair\b/, "gutter repair"],
      [/\bhvac repair\b|\bac repair\b|\bair conditioning repair\b/, "HVAC repair"],
      [/\bplumbing repair\b|\bplumber\b/, "plumbing repair"],
      [/\belectrical repair\b|\belectrician\b/, "electrical repair"],
    ];

    for (const [pattern, service] of services) {
      if (pattern.test(content)) {
        return service;
      }
    }

    return undefined;
  }

  private extractLocation(content: string): string | undefined {
    const match = content.match(
      /\b(?:in|near|located in|property in|house in|home in)\s+([a-z][a-z\s'-]{1,40}?)(?=\s+(?:and|but|because|for|at|on|it's|it is)\b|[.,!?]|$)/i,
    );

    return cleanValue(match?.[1]);
  }

  private extractUrgency(content: string): LeadUrgency | undefined {
    if (
      /\bemergency\b|\bimmediately\b|\bright now\b|\basap\b|\bdangerous\b|\bactive leak\b|\bflooding\b/.test(
        content,
      )
    ) {
      return "critical";
    }

    if (
      /\burgent\b|\bpretty urgent\b|\bsoon as possible\b|\bthis week\b/.test(
        content,
      )
    ) {
      return "high";
    }

    if (
      /\bnot urgent\b|\bno rush\b|\bwhenever\b|\bjust planning\b/.test(
        content,
      )
    ) {
      return "low";
    }

    return undefined;
  }

  private extractPreferredTime(content: string): string | undefined {
    const patterns = [
      /\b(?:available|come|visit|schedule|book)\s+(?:me\s+)?(?:for\s+)?((?:today|tomorrow|this|next)\s+(?:morning|afternoon|evening|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
      /\b(today|tomorrow|this morning|this afternoon|this evening)\b/i,
      /\b(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);

      if (match?.[1]) {
        return cleanValue(match[1]);
      }
    }

    return undefined;
  }
}