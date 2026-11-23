import type { Target } from "./types.ts";

const HTTPS_PORT = 443;
const TARGET_PATTERN = /^(?:\[(?<ipv6>[^\]]+)\]|(?<host>[^:\s]+))(?::(?<port>\d+))?$/;

export function parseTarget(input: string): Target {
  const withoutScheme = input.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const match = TARGET_PATTERN.exec(withoutScheme);
  const host = match?.groups?.ipv6 ?? match?.groups?.host;
  if (!host) {
    throw new TypeError(`invalid target "${input}"`);
  }

  const port = match?.groups?.port === undefined ? HTTPS_PORT : Number(match.groups.port);
  if (port < 1 || port > 65535) {
    throw new TypeError(`invalid port in "${input}"`);
  }
  return { host, port };
}

/** One target per line; blank lines and # comments are ignored. */
export function parseTargetList(text: string): Target[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter((line) => line.length > 0)
    .map(parseTarget);
}

export function formatTarget(target: Target): string {
  const host = target.host.includes(":") ? `[${target.host}]` : target.host;
  return target.port === HTTPS_PORT ? host : `${host}:${target.port}`;
}
