import { createHash, randomUUID } from "node:crypto";
import type {
  VerificationProvider,
  VerificationResult,
  VerificationStart,
} from "./provider.js";

type Outcome = "verified" | "failed";

/**
 * In-memory stand-in for BankID. Sessions resolve on the first check.
 * Tests can force a failure with `failNext()`.
 */
export class FakeVerificationProvider implements VerificationProvider {
  private sessions = new Map<string, { userId: string; outcome: Outcome }>();
  private nextOutcome: Outcome = "verified";

  failNext(): void {
    this.nextOutcome = "failed";
  }

  async start(userId: string): Promise<VerificationStart> {
    const sessionId = randomUUID();
    this.sessions.set(sessionId, { userId, outcome: this.nextOutcome });
    this.nextOutcome = "verified";
    return { sessionId };
  }

  async check(sessionId: string): Promise<VerificationResult> {
    const s = this.sessions.get(sessionId);
    if (!s) return { status: "failed" };
    if (s.outcome === "failed") return { status: "failed" };
    const personalNumberHash = createHash("sha256")
      .update(`fake:${s.userId}`)
      .digest("hex");
    return { status: "verified", personalNumberHash };
  }
}
