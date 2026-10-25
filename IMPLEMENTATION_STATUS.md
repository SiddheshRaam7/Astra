# FORK implementation status

Updated October 24, 2026 (America/New_York).

## Completed and locally verified

- Next.js App Router / React / TypeScript app with a cohesive responsive dark design, Tailwind, accessible Radix/shadcn-style controls, Lucide, Motion, React Flow, Recharts and Zustand.
- All seven navigation sections: Overview, Cash Flow, Goal Planning, Money Leaks, Financial X-Ray, Decision Simulator and Settings.
- One Zod-validated financial model in integer cents; deterministic income, expenses, allocations, discretionary allowance, safe-to-spend, pace, emergency runway and goal calculations.
- Seeded $4,200 income, $2,000 essentials, $600 goals, $350 investments, $250 emergency, $1,000 discretionary plan, $430 spent and $570 remaining.
- Animated, draggable, clickable money bubbles; editable grouped breakdowns; zoom/pan; monthly and three-month allocation views.
- Goal CRUD, deletion confirmation, priorities, progress, contribution requirements and deadline checks; protected emergency reserves and contribution editing.
- Recurring-merchant detection, price increases, possible entertainment overlap, necessary/unnecessary/excluded review states, potential savings and goal acceleration.
- Daily 90-day cash projections, purchase timing, income/saving/subscription scenarios, cash-buffer warnings, assumptions, and fixed-rate loan comparisons. Simulations do not change records.
- CSV parse/review/correction/import with deduplication; validated uploads and evidence/uncertainty/term review UI. PDF/image extraction requires Gemini.
- Persistent assistant across navigation; deterministic read tools; signed, expiring, user/version-bound proposals; explicit confirmation; backend-confirmed saves and immediate UI refresh; cash-flow highlighting.
- Isolated synthetic browser sessions, atomic local file persistence, version-conflict protection, shared state, cross-tab refresh and JSON export.
- PostgreSQL/Drizzle repository, normalized analytics mirrors, migration and monthly SQL spending view. Provider-backed persistence is not live-verified.
- Auth0 SDK v4 Proxy, identities, protected mode and signup/login/logout entry points. Authenticated workspaces start empty and separate from demo accounts. Live Auth0 is not verified.
- Gemini intent/document, ElevenLabs signed-session/client-tool and Plaid Sandbox Link/token/balance/sync/encrypted-storage adapters. Live provider usage is not verified.
- README, architecture/security notes, environment template, integration instructions, Devpost draft, 3:40 demo script, optional DEV article and actual desktop/mobile screenshots.

## Verification results

- `npm test`: **25 passed**. Covers formulas, pending/bill reserves, goals, projections, subscriptions, external-ID deduplication, validation, proposal ownership/signature/expiry, origins, user isolation, concurrent and stale writes.
- `npm run typecheck`: **passed**.
- `npm run build`: **passed**, using Webpack. Turbopack could not bind an internal subprocess port on this host. Auth0 emits an upstream DPoP dynamic-import warning; DPoP is not enabled.
- `E2E_BASE_URL=http://127.0.0.1:3001 npm run test:e2e`: **9 passed against the production build**:
  - Salary edit → bubbles/allowance → refresh → confirmed AI goal change → refresh persistence.
  - Correctable CSV review/import and duplicate skipping.
  - Goal creation/edit/priority/deletion.
  - Subscription review persistence without invented savings.
  - All seven pages at 1440px and 390px without document overflow.
  - Missing voice credentials with usable typed fallback.
  - Browser-session isolation.
  - Assistant history across navigation and financial-node highlighting.
  - Editable aggregate cash-flow breakdowns.
- `npm audit --omit=dev`: **0 vulnerabilities**. Full install audit also reported 0.
- Screenshots: `docs/screenshots/overview-preview.png`, `overview-1440.png`, `overview-390.png`, `cash-flow.png`, `simulator.png`.
- Host Node 20.20.2 passed local checks. Use Node 22.22+ (Node 24 recommended on Vercel) to meet the voice dependency engine requirement. Live voice remains untested.

## External blockers — user setup required

- **Tiger Data:** `DATABASE_URL`, migrations and live SQL persistence/tenant-isolation checks.
- **Auth0:** tenant credentials, callback/logout allowlists and real signup/login/logout verification.
- **Gemini:** API key, model access and live intent/document extraction checks.
- **ElevenLabs:** API key, private agent ID, blocking `askFork(message)` client tool and Gemini agent configuration where supported. Verify microphone → transcript → proposal → confirmation → save. No live voice success is claimed.
- **Plaid:** Sandbox keys, base64 32-byte encryption key, PostgreSQL and actual Link/sync checks. Sandbox only.
- **Vercel:** account/project access and private environment configuration. PostgreSQL and stable `SESSION_SECRET` are required; local-file fallback refuses serverless use. No deployed URL is claimed.
- **GoDaddy:** optional; not connected. No domain purchased.

Configure secrets privately using `.env.example`; never paste them into chat or commit them.

## Remaining production work / limits

- Live provider-backed tests, hosted authentication callbacks and sponsor eligibility verification.
- Refund/transfer reconciliation, overdrafts, multi-currency, per-user time zones (current business date: America/New_York).
- Weekly/annual recurrence and more precise duplicate-service detection. Overlap flags are review hints.
- Plaid background/webhook sync; durable scenario history; SQL-view-backed UI analytics; migration history; normalized initial seeding. Mirrors populate on saves; snapshot remains canonical.
- Database RLS defense in depth; durable local audit events; retention/deletion/recovery; distributed throttling and monitoring.

No paid service, real transfer, investment trade or purchase was initiated. This is a verified local demo with integration adapters, not a claim of a fully deployed production financial service.
