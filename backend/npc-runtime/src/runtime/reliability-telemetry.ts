const DECIMAL_SCALE = 10000;

function asRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * DECIMAL_SCALE) / DECIMAL_SCALE;
}

export interface ReliabilitySnapshot {
  counters: {
    decisionRequests: number;
    toolAttempts: number;
    retryAttempts: number;
    fallbackResponses: number;
    timeoutFailures: number;
    parseFailures: number;
    toolFailures: number;
    budgetExceeded: number;
    invalidPackets: number;
  };
  rates: {
    fallbackRate: number;
    timeoutRate: number;
    parseFailureRate: number;
    toolFailureRate: number;
    budgetExceededRate: number;
  };
}

export class ReliabilityTelemetry {
  private decisionRequests = 0;
  private toolAttempts = 0;
  private retryAttempts = 0;
  private fallbackResponses = 0;
  private timeoutFailures = 0;
  private parseFailures = 0;
  private toolFailures = 0;
  private budgetExceeded = 0;
  private invalidPackets = 0;

  recordDecisionRequest(): void {
    this.decisionRequests += 1;
  }

  recordToolAttempt(): void {
    this.toolAttempts += 1;
  }

  recordRetryAttempt(): void {
    this.retryAttempts += 1;
  }

  recordFailure(reason: string): void {
    switch (reason) {
      case "codex_timeout":
        this.timeoutFailures += 1;
        return;
      case "parse_failure":
        this.parseFailures += 1;
        return;
      case "codex_budget_exceeded":
        this.budgetExceeded += 1;
        return;
      case "invalid_perception_packet":
        this.invalidPackets += 1;
        return;
      default:
        this.toolFailures += 1;
        return;
    }
  }

  recordFallback(): void {
    this.fallbackResponses += 1;
  }

  snapshot(): ReliabilitySnapshot {
    return {
      counters: {
        decisionRequests: this.decisionRequests,
        toolAttempts: this.toolAttempts,
        retryAttempts: this.retryAttempts,
        fallbackResponses: this.fallbackResponses,
        timeoutFailures: this.timeoutFailures,
        parseFailures: this.parseFailures,
        toolFailures: this.toolFailures,
        budgetExceeded: this.budgetExceeded,
        invalidPackets: this.invalidPackets,
      },
      rates: {
        fallbackRate: asRate(this.fallbackResponses, this.decisionRequests),
        timeoutRate: asRate(this.timeoutFailures, this.decisionRequests),
        parseFailureRate: asRate(this.parseFailures, this.decisionRequests),
        toolFailureRate: asRate(this.toolFailures, this.decisionRequests),
        budgetExceededRate: asRate(this.budgetExceeded, this.decisionRequests),
      },
    };
  }
}
