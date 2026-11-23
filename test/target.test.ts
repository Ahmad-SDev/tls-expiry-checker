import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTarget, parseTarget, parseTargetList } from "../src/target.ts";

test("defaults to port 443 and strips URLs down to the host", () => {
  assert.deepEqual(parseTarget("example.com"), { host: "example.com", port: 443 });
  assert.deepEqual(parseTarget("https://example.com/login?next=/"), { host: "example.com", port: 443 });
});

test("reads custom ports, including bracketed IPv6", () => {
  assert.deepEqual(parseTarget("mail.example.com:465"), { host: "mail.example.com", port: 465 });
  assert.deepEqual(parseTarget("[2001:db8::1]:8443"), { host: "2001:db8::1", port: 8443 });
});

test("target lists ignore comments and blank lines", () => {
  const targets = parseTargetList("# customers\nexample.com\n\npanel.example.com:2083  # cPanel\n");

  assert.deepEqual(targets.map(formatTarget), ["example.com", "panel.example.com:2083"]);
});

test("rejects bad ports", () => {
  assert.throws(() => parseTarget("example.com:70000"), /invalid port/);
});
