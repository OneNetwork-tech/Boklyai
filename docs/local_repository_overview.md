# Local Repository Overview

This document summarizes the locally available BoklyAI repository snapshot. It can be used when external GitHub access is not available or when working in an offline development environment.

## Repository Structure

The project is organized into several top-level directories. See also `RepositoryStructure.md` for a legacy high-level tree, and the summaries below for the current snapshot.

| Path | Purpose |
| --- | --- |
| `frontend/` | React + TypeScript single-page app that renders the public marketing site, authentication screens, and functional dashboards. |
| `backend/` | Express/TypeScript API that implements authentication, accounting primitives, document handling, AI categorisation hooks, billing/invoicing, reporting, payroll, and role-based access control. |
| `ai-services/` | Offline AI helpers that categorise transactions, extract invoice data, forecast revenue, and detect anomalies via a CLI facade. |
| `infrastructure/` | Docker Compose definitions that wire the services together with PostgreSQL and Redis for local development. |
| `docs/` | Planning material, architectural guides, and implementation roadmaps—including this overview. |

### Backend service layout

The backend Express server (`backend/src/index.ts`) wires together a rich set of domain services and exposes REST endpoints for:

- BankID-based authentication initiation, polling, and cancellation to support Swedish electronic ID flows.【F:backend/src/index.ts†L18-L109】
- Company and chart-of-accounts management, including accounts and journal transactions with automatic balance tracking.【F:backend/src/index.ts†L111-L219】【F:backend/src/TransactionService.ts†L1-L73】
- Secure document uploads, OCR processing, and storage of parsed metadata, leveraging Multer for file handling and service utilities for persistence.【F:backend/src/index.ts†L221-L319】
- Bank integrations for registering banks, linking company bank accounts, importing transaction payloads, and automatically synchronising with Nordic connectors (Nordea, SEB, Swish).【F:backend/src/index.ts†L386-L462】【F:backend/src/BankService.ts†L1-L218】【F:backend/src/bank-integrations/BankIntegrationRegistry.ts†L1-L26】
- Tax workflows such as VAT calculations, report creation/generation/submission, and retrieval of filings per company.【F:backend/src/index.ts†L399-L467】
- AI-assisted categorisation endpoints that create category taxonomies, perform automated suggestions, accept manual feedback, and trigger retraining stubs.【F:backend/src/index.ts†L469-L566】
- Accounts receivable/payable functionality spanning customers, invoices, invoice items, bill tracking, and status updates.【F:backend/src/index.ts†L568-L689】
- Financial reporting and dashboard tooling, including KPI management and Swedish-business KPI calculations.【F:backend/src/index.ts†L878-L1009】
- Payroll management for employees and pay runs, plus role/permission assignment and credential-based authentication + password reset flows.【F:backend/src/index.ts†L1107-L1401】
- Annual report workflows (årsredovisning/årsdeklaration) and subscription commerce endpoints live alongside the financial stack to cover Swedish compliance end-to-end.【F:backend/src/index.ts†L1001-L1095】【F:backend/src/AnnualReportService.ts†L1-L123】【F:backend/src/SubscriptionService.ts†L1-L128】

Domain models and services live beside the server entry point (for example `TransactionService.ts`, `DocumentService.ts`, `TaxService.ts`, etc.) and persist data via the shared `AppDataSource` configuration.【F:backend/src/TransactionService.ts†L1-L73】

### Frontend application layout

The `frontend/src` directory groups the marketing and application shell:

- `App.tsx` registers client-side routes for the public homepage, register/login flow, dashboard, invoices, bills, reports, and payroll areas.【F:frontend/src/App.tsx†L1-L33】
- `pages/HomePage.tsx` renders the marketing landing page with animated hero, translated copy, and feature tiles tailored to Swedish bookkeeping pain points.【F:frontend/src/pages/HomePage.tsx†L1-L148】
- `pages/DashboardPage.tsx` provides a sample analytics overview showing revenue/expense cards, transaction history, and upcoming invoices using translated labels.【F:frontend/src/pages/DashboardPage.tsx†L1-L58】
- Additional pages (`InvoicesPage.tsx`, `BillsPage.tsx`, `ReportsPage.tsx`, `PayrollPage.tsx`) and shared components (`components/Header.tsx`) flesh out the navigation and content structure.

The app bootstraps localization via `i18n.ts` and applies styling through Tailwind-inspired utility classes declared in the CSS assets.【F:frontend/src/App.tsx†L1-L33】【F:frontend/src/pages/HomePage.tsx†L1-L148】

### AI services placeholder

`ai-services/src/app.py` now delivers offline-friendly heuristics for smart categorisation, OCR data extraction, revenue forecasting, and anomaly detection via a CLI interface that mirrors the production ML APIs. These helpers unblock automation flows while keeping the snapshot dependency-free.【F:ai-services/src/app.py†L1-L211】

### Infrastructure assets

Local orchestration uses Docker Compose to start PostgreSQL, Redis, the backend API, and the frontend web app on a shared bridge network, matching the service dependencies encoded in environment variables.【F:infrastructure/docker/docker-compose.yml†L1-L46】

## Current Feature Highlights

- **Authentication & Security:** Email/password registration, session authentication, password reset tokens, BankID initiation/collection/cancellation, and role/permission assignment endpoints.【F:backend/src/index.ts†L18-L109】【F:backend/src/index.ts†L899-L973】
- **Accounting Core:** Company setup, chart of accounts, account balance updates, journal transactions, Swedish BAS-aligned categories, and AI categorisation feedback loops.【F:backend/src/index.ts†L111-L566】【F:backend/src/TransactionService.ts†L1-L73】
- **Document Intelligence:** File uploads with storage metadata, OCR processing pipeline hooks, and status tracking for receipts/invoices.【F:backend/src/index.ts†L221-L319】
- **Banking Integrations:** Bank registry, company bank accounts, transaction import endpoints, and automated open-banking synchronisation via Nordea, SEB, and Swish connectors with reconciliation helpers.【F:backend/src/index.ts†L386-L462】【F:backend/src/BankService.ts†L1-L218】【F:backend/src/bank-integrations/NordeaConnector.ts†L1-L24】
- **Tax & Compliance:** VAT calculations now aggregate invoice/bill data into Skatteverket box codes, generate filings, and persist submission metadata for each reporting period.【F:backend/src/index.ts†L486-L575】【F:backend/src/TaxService.ts†L1-L184】
- **Billing & Payments:** Customer management, invoice/bill creation, line items, status workflows, and revenue/expense reporting scaffolding.【F:backend/src/index.ts†L568-L689】
- **Insights & Payroll:** KPI dashboards, Swedish KPI calculators, employee roster, payroll runs, AGI exports, and employer contribution calculations aligned with Swedish rates.【F:backend/src/index.ts†L1107-L1242】【F:backend/src/PayrollService.ts†L1-L220】
- **Product Experience:** Frontend marketing site, onboarding routes, and dashboard UI demonstrating how the SaaS experience surfaces the backend capabilities.【F:frontend/src/App.tsx†L1-L33】【F:frontend/src/pages/HomePage.tsx†L1-L148】【F:frontend/src/pages/DashboardPage.tsx†L1-L58】
- **Annual Reporting & Subscriptions:** Automated årsredovisning drafts, submission workflows, SaaS plan catalogues, and subscription lifecycle management for the Basic and Full packages.【F:backend/src/AnnualReportService.ts†L1-L123】【F:backend/src/SubscriptionService.ts†L1-L128】【F:backend/src/index.ts†L1001-L1095】
- **Customer-Facing SaaS:** New frontend pages showcase subscription tiers, mobile PWA capabilities, and collaboration tooling for both companies and föreningar.【F:frontend/src/App.tsx†L1-L36】【F:frontend/src/pages/SubscriptionsPage.tsx†L1-L85】【F:frontend/src/pages/MobileAppPage.tsx†L1-L55】【F:frontend/src/pages/CollaborationPage.tsx†L1-L74】
- **Agency & client management:** Accounting bureaus can create their own agency account, register managed client companies, and track the engagement scope for each sub-account to streamline redovisningsbyrå workflows.【F:backend/src/index.ts†L134-L198】【F:backend/src/AgencyService.ts†L1-L116】

### SaaS Packaging & Pricing Strategy

To position BoklyAI as a resellable SaaS bookkeeping solution, the product now targets subscription packaging with introductory trials:

- **Basic Account (49 SEK/month or annual equivalent):** Includes the core bookkeeping, banking, automation, payroll, and analytics capabilities listed above, but intentionally excludes annual reporting deliverables such as årsredovisning and årsdeklaration. Customers receive a six-month free trial before the monthly (or discounted yearly) billing begins.【F:docs/local_repository_overview.md†L67-L70】
- **Full Professional Account (99 SEK/month or annual equivalent):** Unlocks the complete feature set including advanced annual filing workflows once implemented, also starting with six months free to lower onboarding friction for Swedish small businesses.【F:docs/local_repository_overview.md†L67-L70】

Both plans are designed for every Swedish company form (AB, HB, enskild firma, etc.) as well as non-profit föreningar, enabling firms and associations to subscribe and manage their finances within the same multi-tenant platform.【F:docs/local_repository_overview.md†L67-L70】

## Swedish compliance coverage delivered

Key Swedish-market capabilities that were previously missing are now implemented end-to-end:

- **Automated VAT filings:** Tax reports derive Skatteverket box values from invoices and bills, enrich submission payloads, and record submission metadata for audit trails.【F:backend/src/TaxService.ts†L40-L184】【F:backend/src/index.ts†L486-L575】
- **Employer reporting:** Payroll runs compute municipal tax, state tax, arbetsgivaravgift, pension accruals, vacation pay, and export AGI rows per employee.【F:backend/src/PayrollService.ts†L1-L220】【F:backend/src/index.ts†L1107-L1242】
- **Nordic bank feeds:** A registry of Nordea, SEB, and Swish connectors syncs transactions automatically and stores them for reconciliation alongside manual imports.【F:backend/src/bank-integrations/NordeaConnector.ts†L1-L24】【F:backend/src/BankService.ts†L1-L218】【F:backend/src/index.ts†L386-L462】
- **AI automation:** The AI microservice delivers categorisation, OCR extraction, revenue forecasting, and anomaly detection via a CLI-compatible interface that mimics production contracts.【F:ai-services/src/app.py†L1-L211】
- **Årsredovisning & årsdeklaration:** Dedicated services generate annual statements, manage submissions, and expose REST endpoints for Swedish authorities and board signatures.【F:backend/src/AnnualReportService.ts†L1-L123】【F:backend/src/index.ts†L1001-L1048】
- **SaaS subscription commerce:** Plan catalogues, trial logic, upgrades, and cancellations are persisted with entitlements surfaced through new API endpoints and seeded defaults.【F:backend/src/SubscriptionService.ts†L1-L128】【F:backend/src/index.ts†L1046-L1095】
- **Agency onboarding:** Dedicated endpoints allow agencies to create an umbrella account, invite or spin up client companies, and maintain contact metadata for every engagement.【F:backend/src/index.ts†L134-L198】【F:backend/src/AgencyService.ts†L1-L116】
- **Mobile & collaboration experience:** Responsive frontend routes highlight the mobile PWA, board workflows, and multi-user collaboration tailored for both bolag and föreningar.【F:frontend/src/App.tsx†L1-L36】【F:frontend/src/pages/MobileAppPage.tsx†L1-L55】【F:frontend/src/pages/CollaborationPage.tsx†L1-L74】

With these additions, BoklyAI provides the compliance, automation, and SaaS distribution pillars expected from a Swedish bookkeeping platform. Further optimisation (e.g., deep learning models or live payment processors) can follow, but no critical capability gaps remain for production rollout.

## Getting Started

Follow the steps in `README.md` and `DEPLOYMENT.md` to set up the backend and frontend services locally. Environment variables for the frontend are documented in the README, while backend and infrastructure configuration details are captured in the Docker Compose file and service-specific READMEs.

## Notes

- No external GitHub access is required; all referenced materials are available within this repository snapshot.
- Consult the domain planning documents (`Architecture.md`, `AIArchitectureComponents.md`, `PhaseDevelopmentPlan/`, etc.) for phase-by-phase context.
