import { formatTarget } from "./target.ts";
import type { CertificateReport } from "./types.ts";

export function formatTable(reports: CertificateReport[]): string {
  const rows = reports.map((report) => [
    report.state.toUpperCase(),
    formatTarget(report.target),
    report.daysLeft === undefined ? "-" : `${report.daysLeft}d`,
    report.validTo?.slice(0, 10) ?? "-",
    report.detail ?? report.issuer ?? "",
  ]);
  const header = ["STATE", "HOST", "LEFT", "EXPIRES", "ISSUER / DETAIL"];
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column]?.length ?? 0)));

  return [header, ...rows]
    .map((row) => row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ").trimEnd())
    .join("\n");
}
