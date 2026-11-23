export interface Target {
  host: string;
  port: number;
}

export interface PeerCertificate {
  subject: string;
  issuer: string;
  subjectAltNames: string[];
  validFrom: Date;
  validTo: Date;
  /** Set when the chain or hostname did not verify, e.g. "CERT_HAS_EXPIRED" or "self-signed certificate". */
  verificationError?: string;
}

export interface CertificateFetcher {
  fetch(target: Target): Promise<PeerCertificate>;
}

export type CertificateState = "ok" | "expiring" | "expired" | "untrusted" | "unreachable";

export interface CertificateReport {
  target: Target;
  state: CertificateState;
  daysLeft?: number;
  validTo?: string;
  issuer?: string;
  detail?: string;
}
