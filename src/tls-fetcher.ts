import { isIP } from "node:net";
import tls from "node:tls";
import type { CertificateFetcher, PeerCertificate, Target } from "./types.ts";

export interface TlsFetcherOptions {
  timeoutMs?: number;
  /** Extra trusted CA certificates (PEM), for internal CAs. */
  ca?: string | Buffer | Array<string | Buffer>;
}

/**
 * Completes a TLS handshake and reads the leaf certificate. Verification failures don't
 * abort the handshake, so an expired or self-signed certificate can still be inspected.
 */
export class TlsCertificateFetcher implements CertificateFetcher {
  private readonly timeoutMs: number;
  private readonly ca: TlsFetcherOptions["ca"];

  constructor(options: TlsFetcherOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.ca = options.ca;
  }

  fetch(target: Target): Promise<PeerCertificate> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: target.host,
        port: target.port,
        servername: isIP(target.host) ? undefined : target.host,
        rejectUnauthorized: false,
        ca: this.ca,
        timeout: this.timeoutMs,
      });

      socket.once("secureConnect", () => {
        const certificate = socket.getPeerCertificate();
        const verificationError = socket.authorizationError?.toString() ?? hostnameError(target.host, certificate);
        socket.end();

        if (!certificate || Object.keys(certificate).length === 0) {
          reject(new Error("server sent no certificate"));
          return;
        }
        resolve(toPeerCertificate(certificate, verificationError));
      });
      socket.once("timeout", () => socket.destroy(new Error(`no TLS handshake within ${this.timeoutMs} ms`)));
      socket.once("error", reject);
    });
  }
}

function hostnameError(host: string, certificate: tls.PeerCertificate): string | undefined {
  return tls.checkServerIdentity(host, certificate)?.message;
}

function toPeerCertificate(certificate: tls.PeerCertificate, verificationError: string | undefined): PeerCertificate {
  return {
    subject: firstValue(certificate.subject?.CN),
    issuer: firstValue(certificate.issuer?.O ?? certificate.issuer?.CN),
    subjectAltNames: (certificate.subjectaltname ?? "")
      .split(", ")
      .filter(Boolean)
      .map((name) => name.replace(/^(DNS|IP Address):/, "")),
    validFrom: new Date(certificate.valid_from),
    validTo: new Date(certificate.valid_to),
    verificationError,
  };
}

function firstValue(field: string | string[] | undefined): string {
  return (Array.isArray(field) ? field[0] : field) ?? "";
}
