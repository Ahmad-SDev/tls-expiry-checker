import { evaluateCertificate, unreachableReport } from "./evaluate.ts";
import type { CertificateFetcher, CertificateReport, CertificateState, Target } from "./types.ts";

export interface CheckOptions {
  warnDays?: number;
  concurrency?: number;
  now?: () => Date;
}

const STATE_ORDER: Record<CertificateState, number> = {
  expired: 0,
  unreachable: 1,
  untrusted: 2,
  expiring: 3,
  ok: 4,
};

export async function checkCertificates(
  targets: Target[],
  fetcher: CertificateFetcher,
  options: CheckOptions = {},
): Promise<CertificateReport[]> {
  const warnDays = options.warnDays ?? 21;
  const now = options.now ?? (() => new Date());

  const reports = await mapWithConcurrency(targets, options.concurrency ?? 10, async (target) => {
    try {
      const certificate = await fetcher.fetch(target);
      return evaluateCertificate(target, certificate, { warnDays, now: now() });
    } catch (error) {
      return unreachableReport(target, error);
    }
  });

  return reports.sort(
    (a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.daysLeft ?? 0) - (b.daysLeft ?? 0),
  );
}

export function needsAttention(report: CertificateReport): boolean {
  return report.state !== "ok";
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index] as T);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
}
