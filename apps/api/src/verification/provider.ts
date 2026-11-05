export type VerificationStatus = "pending" | "verified" | "failed";

export interface VerificationStart {
  /** Opaque id the caller keeps and uses to poll for the result. */
  sessionId: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  /** Only set once verified. Never log or return this to other users. */
  personalNumberHash?: string;
}

/** Identity check used before a profile goes live. BankID will implement this later. */
export interface VerificationProvider {
  start(userId: string): Promise<VerificationStart>;
  check(sessionId: string): Promise<VerificationResult>;
}
