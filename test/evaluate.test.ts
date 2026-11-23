import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateCertificate } from "../src/evaluate.ts";
import type { PeerCertificate } from "../src/types.ts";

const NOW = new Date("2026-11-23T12:00:00Z");
const TARGET = { host: "example.com", port: 443 };

function certificate(daysLeft: number, verificationError?: string): PeerCertificate {
  return {
    subject: "example.com",
    issuer: "Let's Encrypt",
    subjectAltNames: ["example.com"],
    validFrom: new Date("2026-09-01T00:00:00Z"),
    validTo: new Date(NOW.getTime() + daysLeft * 86_400_000),
    verificationError,
  };
}

const evaluate = (cert: PeerCertificate) => evaluateCertificate(TARGET, cert, { warnDays: 21, now: NOW });

test("healthy certificate is ok", () => {
  const report = evaluate(certificate(60));

  assert.equal(report.state, "ok");
  assert.equal(report.daysLeft, 60);
  assert.equal(report.issuer, "Let's Encrypt");
});

test("certificate inside the warning window is expiring", () => {
  assert.equal(evaluate(certificate(20)).state, "expiring");
});

test("expired wins over the verification error it causes", () => {
  const report = evaluate(certificate(-2, "certificate has expired"));

  assert.equal(report.state, "expired");
  assert.equal(report.daysLeft, -2);
});

test("trust problems are reported with their reason", () => {
  const report = evaluate(certificate(300, "self-signed certificate"));

  assert.equal(report.state, "untrusted");
  assert.equal(report.detail, "self-signed certificate");
});
