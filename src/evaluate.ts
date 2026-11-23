import type { CertificateReport, PeerCertificate, Target } from "./types.ts";

const MS_PER_DAY = 86_400_000;

export interface EvaluationPolicy {
  warnDays: number;
  now: Date;
}

export function evaluateCertificate(
  target: Target,
  certificate: PeerCertificate,
  policy: EvaluationPolicy,
): CertificateReport {
  const daysLeft = Math.floor((certificate.validTo.getTime() - policy.now.getTime()) / MS_PER_DAY);
  const base = {
    target,
    daysLeft,
    validTo: certificate.validTo.toISOString(),
    issuer: certificate.issuer,
  };

  if (daysLeft < 0) {
    return { ...base, state: "expired" };
  }
  // Expiry is reported before trust problems because it is the one that needs action first.
  if (certificate.verificationError && !isExpiryError(certificate.verificationError)) {
    return { ...base, state: "untrusted", detail: certificate.verificationError };
  }
  if (daysLeft < policy.warnDays) {
    return { ...base, state: "expiring" };
  }
  return { ...base, state: "ok" };
}

export function unreachableReport(target: Target, error: unknown): CertificateReport {
  return { target, state: "unreachable", detail: error instanceof Error ? error.message : String(error) };
}

function isExpiryError(message: string): boolean {
  return /expired/i.test(message);
}
