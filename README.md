# tls-expiry-checker

Checks the TLS certificates on a list of hosts and tells you which ones need attention before customers notice. I use it for the sites and panels on hosting servers, where one forgotten renewal means a "your connection is not private" page.

For every host it does a real TLS handshake (with SNI) and reports:

| State         | Meaning                                                     |
|---------------|-------------------------------------------------------------|
| `EXPIRED`     | past its end date                                           |
| `UNREACHABLE` | DNS, connection or handshake failed                         |
| `UNTRUSTED`   | self-signed, incomplete chain or wrong hostname             |
| `EXPIRING`    | valid but ends within `--warn-days` (default 21)            |
| `OK`          | valid and trusted                                           |

Expired and untrusted certificates are still read, so you see the dates and issuer instead of just an error. Results are sorted with the worst problems on top.

TypeScript, no runtime dependencies, Node 22.18+.

## Usage

```bash
npm install -g github:Ahmad-SDev/tls-expiry-checker

tls-expiry github.com expired.badssl.com self-signed.badssl.com wrong.host.badssl.com nope.invalid
```

```
STATE        HOST                    LEFT    EXPIRES     ISSUER / DETAIL
EXPIRED      expired.badssl.com      -4243d  2015-04-12  COMODO CA Limited
UNREACHABLE  nope.invalid            -       -           getaddrinfo ENOTFOUND nope.invalid
UNTRUSTED    wrong.host.badssl.com   35d     2026-12-28  ERR_TLS_CERT_ALTNAME_INVALID
UNTRUSTED    self-signed.badssl.com  724d    2028-11-16  DEPTH_ZERO_SELF_SIGNED_CERT
OK           github.com              65d     2027-01-27  Sectigo Limited
```

For many hosts, keep a list (one per line, `#` comments allowed, any port works for SMTPS, cPanel and so on):

```text
# customer sites
example.com
shop.example.com
panel.example.com:2083   # cPanel
mail.example.com:465
```

```bash
tls-expiry --file hosts.txt --warn-days 14 --concurrency 20
tls-expiry --file hosts.txt --json > report.json
```

The exit code is 1 whenever something needs attention, so a daily cron job or a CI schedule can alert on it.

## As a library

```ts
import { checkCertificates, TlsCertificateFetcher } from "tls-expiry-checker";

const reports = await checkCertificates(
  [{ host: "example.com", port: 443 }],
  new TlsCertificateFetcher({ timeoutMs: 3000 }),
  { warnDays: 30 },
);
```

`checkCertificates` depends only on the `CertificateFetcher` interface, so the sorting, concurrency limit and expiry rules are tested with a stub, and the real TLS code is tested against a local TLS server.

## Development

```bash
npm install
npm run typecheck
npm test
```

## License

MIT
