#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { checkCertificates, needsAttention } from "./check.ts";
import { formatTable } from "./format.ts";
import { parseWholeNumber } from "./options.ts";
import { parseTarget, parseTargetList } from "./target.ts";
import { TlsCertificateFetcher } from "./tls-fetcher.ts";
import type { Target } from "./types.ts";

const USAGE = `usage: tls-expiry [host[:port] ...] [--file hosts.txt] [--warn-days 21] [--json]

Exits with 1 when any certificate is expiring, expired, untrusted or unreachable.`;

async function collectTargets(positionals: string[], file: string | undefined): Promise<Target[]> {
  const targets = positionals.map(parseTarget);
  if (file) {
    targets.push(...parseTargetList(await readFile(file, "utf8")));
  }
  return targets;
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      file: { type: "string", short: "f" },
      "warn-days": { type: "string", default: "21" },
      timeout: { type: "string", default: "5000" },
      concurrency: { type: "string", default: "10" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  let targets: Target[];
  let warnDays: number;
  let timeoutMs: number;
  let concurrency: number;
  try {
    warnDays = parseWholeNumber("warn-days", values["warn-days"], 0, 3650);
    timeoutMs = parseWholeNumber("timeout", values.timeout, 100, 120_000);
    concurrency = parseWholeNumber("concurrency", values.concurrency, 1, 256);
    targets = await collectTargets(positionals, values.file);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 2;
  }
  if (targets.length === 0) {
    console.error(USAGE);
    return 2;
  }

  const reports = await checkCertificates(targets, new TlsCertificateFetcher({ timeoutMs }), { warnDays, concurrency });

  console.log(values.json ? JSON.stringify(reports, null, 2) : formatTable(reports));
  return reports.some(needsAttention) ? 1 : 0;
}

process.exitCode = await main(process.argv.slice(2));
