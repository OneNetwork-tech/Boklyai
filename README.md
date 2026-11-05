# BoklyAI – bokföring för svenska företag

BoklyAI is a bookkeeping system for small Swedish companies (AB and enskild firma). It is built on a real double-entry ledger that follows Bokföringslagen and the BAS chart of accounts. It handles customer and supplier invoices, bank reconciliation with AI suggestions, the VAT return (momsdeklaration), the annual close, payroll with AGI support, and SIE4 export. The web interface is in Swedish and English.

## Features

| Area | What you get |
|---|---|
| **Ledger** | Vouchers (verifikationer) with gapless numbering per series and fiscal year. Vouchers can't be edited; you correct them with a reversing voucher. Period lock, fiscal years and a year-end close that books the result to 2099. Every company gets its own BAS 2024 chart of accounts |
| **Sales** | Customers, invoice drafts with per-line VAT (25 / 12 / 6 / 0 %), issuing with an invoice number and a Bankgirot OCR reference, ledger posting, part payments, credit notes, overdue tracking and a printable invoice (print to PDF) |
| **Purchases** | Suppliers and supplier invoices, booked with input VAT (2641) and accounts payable (2440), plus payments. Upload a PDF or photo of the invoice and **OCR fills in the fields** (amount, VAT, dates, org number, OCR reference, invoice number) |
| **Bank** | CSV import for Swedish bank exports (Swedbank, SEB, Handelsbanken, Nordea, Danske, Lunar…). Re-importing the same file never creates duplicates. **AI suggestions** match transactions to open invoices by OCR reference or amount and propose accounts learned from your own earlier bookings, falling back to built-in patterns for common merchants. One-click booking splits out the VAT |
| **VAT** | Momsdeklaration boxes 05, 10, 11, 12, 42, 48 and 49, computed from the ledger. Monthly, quarterly or yearly periods. A settlement voucher moves the balances to 2650 |
| **Reports** | Income statement and balance sheet in K2/K3 layout, trial balance (saldobalans), general ledger (huvudbok) with running balance, a dashboard, and **SIE4 export** in PC8 (CP437) encoding |
| **Payroll** | Employees with validated personnummer, payroll runs with preliminary tax, employer contributions (31.42 %, or 10.21 % for employees aged 66+), additions and deductions, booking, printable payslips and an AGI summary (ruta 011 and 001) |
| **Documents** | Receipts and invoices stored privately, with the file type checked by content and OCR text extraction. Documents attached to a voucher can't be deleted (they must be kept for 7 years) |
| **Users** | Multi-company: one login can belong to several companies. Roles are owner, accountant, member and viewer. Invitations by email, an audit log, and **BankID** login (RP API v6.0) |

## Quick start (Docker)

```bash
cp .env.example .env    # set SESSION_SECRET (openssl rand -hex 32) and POSTGRES_PASSWORD
docker compose up -d --build
```

Open <http://localhost:3000>, create an account, and add your company. A BAS chart of accounts, a fiscal year and a bank account linked to 1930 are created automatically.

## Deploy to your own server (CI/CD with Docker)

Every push to GitHub runs the tests and, if they pass, publishes the Docker image to GitHub Container Registry:

| Tag | Points to |
|---|---|
| `latest` | the newest build of the default branch |
| `<branch>` | the newest build of a branch, e.g. `claude-charming-noether-lhy664` (`/` becomes `-`) |
| `sha-<7 chars>` | one exact commit |
| `1.2.3` | a `v1.2.3` git tag |

Image: `ghcr.io/onenetwork-tech/boklyai`.

The server needs nothing except Docker with the Compose plugin. Nothing is built there.

**One-time setup on the server**

1. Log in to the registry with a GitHub token that has `read:packages`. Packages are private unless you make them public under the repository's *Packages*.

   ```bash
   docker login ghcr.io -u <your-github-username>
   ```

2. Copy the deploy files from this repository and create the settings file:

   ```bash
   mkdir -p ~/apps/boklyai && cd ~/apps/boklyai
   # copy deploy/docker-compose.yml, deploy/deploy.sh and deploy/.env.example here, then:
   cp .env.example .env
   ```

3. Fill in `.env`. Generate the secrets with `openssl` as the comments say, and set `IMAGE_TAG` to `latest` or to a branch tag.

**Deploy or update**

```bash
./deploy.sh                # pull IMAGE_TAG from .env and restart
./deploy.sh sha-1a2b3c4    # roll forward or back to one exact build
```

`deploy.sh` pulls the image, restarts the stack, waits until `/api/health` reports healthy, and prints the logs if it doesn't. Data is kept in Docker volumes across updates. To start from scratch, run `docker compose down -v`, which deletes all data.

**Plain HTTP on a LAN.** The app is HTTPS-only in production by default. When you test it as `http://<server-ip>:<port>`, keep `HTTPS_ONLY=false` and `SECURE_COOKIES=false` in `.env` as the example has them, and set `PUBLIC_URL` to the exact address you open (it is checked against the browser's Origin header). Otherwise login won't work. Once a TLS reverse proxy (Caddy, Traefik, nginx) is in front, switch it back.

**Going public with HTTPS.** `deploy/Caddyfile.example` puts [Caddy](https://caddyserver.com) in front of the app. Caddy gets and renews Let's Encrypt certificates automatically.

1. Point the domain's DNS A/AAAA record at the server and open ports 80 and 443.
2. Install Caddy, replace `bokforing.example.se` in the example, copy it to `/etc/caddy/Caddyfile`, then run `sudo systemctl reload caddy`.
3. In `.env`, turn on the settings under "Behind an HTTPS reverse proxy": `PUBLIC_URL=https://…`, `HTTPS_ONLY=true`, `SECURE_COOKIES=true`, `TRUST_PROXY=loopback, 172.16.0.0/12` and `BIND_ADDRESS=127.0.0.1`. Then run `./deploy.sh`.

`BIND_ADDRESS=127.0.0.1` means only Caddy can reach the app, so plain `http://<server-ip>:3002` stops working.

**Backups.** `./backup.sh` saves the database, the uploaded receipts and documents, and `.env` to `backups/<timestamp>/`, and keeps the newest 14.

- Schedule it nightly with cron, for example `15 3 * * * cd ~/apps/boklyai && ./backup.sh >> backups/backup.log 2>&1`.
- Copy the `backups` folder off the server.
- The backups contain secrets and personal data, so keep them private.

To restore onto the same or a new server:

```bash
cp backups/<timestamp>/env .env    # only on a new server
docker compose up -d db
./restore.sh backups/<timestamp>
```

`restore.sh` replaces the current data, so it asks you to confirm first.

**Automatic deploys (optional).** CI can deploy every push of one branch to your server:

1. On the server, install a [self-hosted GitHub Actions runner](https://docs.github.com/actions/hosting-your-own-runners) for this repository and give it the label `local-server`. The runner's user must be allowed to run `docker`.
2. Create `~/apps/boklyai/.env` on the server once, as above.
3. In the repository's *Settings → Secrets and variables → Actions → Variables*, set `LOCAL_DEPLOY_BRANCH` to the branch to deploy, for example `main`. Set `LOCAL_DEPLOY_DIR` too if you use a different folder.

The `deploy-local` job then runs `deploy.sh` with the exact image CI just built (`sha-…`). It is skipped when `LOCAL_DEPLOY_BRANCH` isn't set.

**Running all four apps on one server.** The deploy files use different ports, so SalmanPlex, BoklyAI, RentalHive and Nikah Noor can run side by side:

| App | Port(s) | Health check |
|---|---|---|
| SalmanPlex | 3001 | `/api/health` |
| BoklyAI | 3002 | `/api/health` |
| RentalHive | 8081 (web), 8082 (API) | `/health` |
| Nikah Noor | 8083 | `/health` |

## Development

You need Node.js 20 or newer and PostgreSQL 13 or newer. OCR additionally needs `tesseract` (with Swedish data) and `pdftotext` (poppler); everything else works without them.

```bash
# API on :3000 (migrations run automatically)
cd backend && npm install
DATABASE_URL=postgres://boklyai:pass@localhost:5432/boklyai npm run dev

# Web app on :5173 (proxies /api to :3000)
cd frontend && npm install && npm run dev
```

Without `SMTP_URL`, emails such as password resets and invitations are printed to the API log.

### Tests

```bash
cd backend
TEST_DATABASE_URL=postgres://boklyai:pass@localhost:5432/boklyai_test npm test
```

The suite has 69 tests and runs against a real PostgreSQL; it drops and recreates the schema of the test database, so point it at a dedicated one. It covers a full bookkeeping year:

- security: sessions, CSRF, origin checks, login lockout, password reset, BankID, tenant isolation and roles
- ledger invariants enforced in the database (balance check at commit, immutable vouchers)
- invoicing and supplier invoices, bank import, matching and learning, documents
- the VAT return and its settlement, reports, SIE4, payroll, the period lock and the year-end close

CI runs the backend tests against PostgreSQL, builds the frontend, and builds and smoke-tests the Docker image.

## How the accounting works

All amounts are integers in **öre** throughout the API and the database, so floating-point rounding errors can't occur. Each voucher line has a non-negative debit or credit, never both.

| Series | Created by |
|---|---|
| A | Manual vouchers |
| B | Bank transactions booked directly to an account |
| F | Customer invoices and credit notes |
| I | Incoming payments on customer invoices |
| L | Supplier invoices |
| U | Payments of supplier invoices |
| P | Payroll |
| M | VAT settlement |
| Y | Year-end result |

Rules enforced both in the application and in PostgreSQL:

- **Balance:** debit equals credit, and every voucher has at least two lines. A deferred constraint trigger checks this when the transaction commits.
- **Immutability:** `UPDATE` and `DELETE` on vouchers and voucher lines raise an error. The only change allowed is setting the "reversed by" link once.
- **Gapless numbering:** numbers come from a row-locked sequence inside the posting transaction, so a failed posting leaves no gap.
- **Dates:** a posting must fall in an open fiscal year and after the company's lock date. Closing a year locks it permanently.
- **Correction from the source:** vouchers created from invoices, payroll or the VAT settlement can't be reversed directly; you correct the source document instead, for example with a credit note.

Opening balances need no separate entries. Balance-sheet accounts (1xxx–2xxx) carry over between fiscal years automatically, and result accounts start from zero in each year.

## Security

- **Sessions:** an opaque random token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie, stored only as a SHA-256 hash. Sessions expire after idle time and after an absolute timeout. Changing or resetting a password signs out other sessions.
- **CSRF:** a per-session token must be sent in the `X-CSRF-Token` header on every state-changing request, and requests from other origins are rejected.
- **Passwords:** bcrypt with 12 rounds and a minimum length of 12. Login responses take the same time whether or not the account exists. Accounts lock for 15 minutes after 5 failed attempts, and the auth endpoints are rate-limited.
- **Password reset:** single-use tokens, stored hashed, valid for 1 hour, sent only by email (never returned by the API). The response is the same whether or not the email is registered.
- **Tenancy:** every company route checks membership and role. Non-members get `404` for another company, so company IDs can't be probed. Payroll data (personnummer, salaries) is limited to accountants and owners.
- **Documents:** the file type is detected from the content (PDF, JPEG, PNG or WebP only). Files are stored outside the web root with random names and `0600` permissions, and are served with `nosniff` and a restrictive CSP.
- **BankID:** RP API v6.0 with mutual TLS. `endUserIp` comes from the connection, never from the client. `qrStartSecret` stays on the server; animated QR codes are computed there. Each order is bound to the browser that started it by an `HttpOnly` cookie.
- **Browser and database:** strict Content-Security-Policy, `Cache-Control: no-store` on API responses, parameterised SQL everywhere, and an audit log of all changes.

## Configuration

`.env.example` documents every setting. You need `SESSION_SECRET`, the database settings and `PUBLIC_URL`. For BankID in production, set `BANKID_ENABLED=true`, `BANKID_API_URL=https://appapi2.bankid.com/rp/v6.0` and the paths to your RP certificate and key.

## Project layout

```
backend/
  src/db/migrations/   SQL schema, including the ledger triggers
  src/services/        ledger, sales, purchases, bankImport, categorizer, documents (OCR),
                       payroll, reports (VAT/P&L/BS), sie, bankid, sessions
  src/routes/          REST API under /api (company routes: /api/companies/:id/...)
  tests/               unit and PostgreSQL integration tests
frontend/
  src/pages/           Dashboard, Sales, Purchases, Bank, Ledger, Reports (+VAT), Payroll, Settings
  src/i18n.ts          Swedish and English texts
Dockerfile             one image: the API serves the built SPA; includes tesseract and poppler
```

## Scope and limitations

BoklyAI covers day-to-day bookkeeping for a domestic Swedish company. It doesn't yet handle:

- EU and reverse-charge VAT (momsdeklaration boxes 20–39), foreign currency, or e-invoicing over Peppol
- SIE import (only export is supported)
- tax tables: preliminary tax uses each employee's percentage; it doesn't look up Skatteverket's tables, and you upload the AGI to Skatteverket yourself
- reduced employer-contribution rates other than the 66+ rule (for example youth reductions or växa-stöd); you can override the rate on each payslip
- Skatteverket certification. Have the annual accounts reviewed by an accountant.

The files in `PhaseDevelopmentPlan/` and `docs/` are earlier planning documents; this README describes what is actually implemented.
