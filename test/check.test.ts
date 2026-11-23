import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import tls from "node:tls";
import { checkCertificates, needsAttention } from "../src/check.ts";
import { TlsCertificateFetcher } from "../src/tls-fetcher.ts";
import type { CertificateFetcher, PeerCertificate, Target } from "../src/types.ts";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
const certificatePem = fixture("localhost-cert.pem");

let server: tls.Server;
let port: number;

before(async () => {
  server = tls.createServer({ key: fixture("localhost-key.pem"), cert: certificatePem }, (socket) => socket.end());
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

after(() => server.close());

test("reads the certificate from a real TLS handshake", async () => {
  const certificate = await new TlsCertificateFetcher({ ca: certificatePem }).fetch({ host: "localhost", port });

  assert.equal(certificate.subject, "localhost");
  assert.deepEqual(certificate.subjectAltNames, ["localhost", "127.0.0.1"]);
  assert.equal(certificate.verificationError, undefined);
});

test("self-signed certificates are inspected but flagged as untrusted", async () => {
  const [report] = await checkCertificates([{ host: "localhost", port }], new TlsCertificateFetcher());

  assert.equal(report?.state, "untrusted");
  assert.ok((report?.daysLeft ?? 0) > 3650);
});

class StubFetcher implements CertificateFetcher {
  readonly inFlight: number[] = [];
  private active = 0;
  private readonly daysLeftByHost: Record<string, number>;

  constructor(daysLeftByHost: Record<string, number>) {
    this.daysLeftByHost = daysLeftByHost;
  }

  async fetch(target: Target): Promise<PeerCertificate> {
    this.active++;
    this.inFlight.push(this.active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    this.active--;

    const daysLeft = this.daysLeftByHost[target.host];
    if (daysLeft === undefined) {
      throw new Error("connect ECONNREFUSED");
    }
    return {
      subject: target.host,
      issuer: "Test CA",
      subjectAltNames: [target.host],
      validFrom: new Date(0),
      validTo: new Date(Date.now() + daysLeft * 86_400_000 + 60_000),
    };
  }
}

test("sorts the worst problems first and limits concurrency", async () => {
  const fetcher = new StubFetcher({ healthy: 80, soon: 5, gone: -3 });
  const targets = ["healthy", "down", "soon", "gone"].map((host) => ({ host, port: 443 }));

  const reports = await checkCertificates(targets, fetcher, { concurrency: 2 });

  assert.deepEqual(
    reports.map((report) => `${report.target.host}:${report.state}`),
    ["gone:expired", "down:unreachable", "soon:expiring", "healthy:ok"],
  );
  assert.ok(Math.max(...fetcher.inFlight) <= 2);
  assert.equal(reports.filter(needsAttention).length, 3);
});
