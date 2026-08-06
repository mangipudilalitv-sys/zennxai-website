export interface BusinessMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  appointmentsBooked: number;
  followUps: number;
}

export class BusinessBrain {
  private readonly metrics: BusinessMetrics = {
    totalLeads: 0,
    qualifiedLeads: 0,
    appointmentsBooked: 0,
    followUps: 0,
  };

  public update(result: {
    success: boolean;
    action: string;
  }): void {
    switch (result.action) {
      case "REQUEST_ESTIMATE":
        this.metrics.totalLeads++;
        break;

      case "BOOK_APPOINTMENT":
        this.metrics.appointmentsBooked++;
        break;

      case "FOLLOW_UP":
        this.metrics.followUps++;
        break;
    }

    if (
      result.action === "REQUEST_ESTIMATE" &&
      result.success
    ) {
      this.metrics.qualifiedLeads++;
    }
  }

  public getMetrics(): BusinessMetrics {
    return structuredClone(this.metrics);
  }
}