# Submission checklist

Before zipping, verify every item below.

## Code

- [ ] `src/handlers/ingest.ts` — implemented (not throwing `not implemented`)
- [ ] `src/utils/index-name.ts` — implemented
- [ ] `serverless.functions.yml` — function definition with handler, timeout, S3 event
- [ ] `serverless.yml` — IAM role statements filled in

## Required documents

- [ ] `POSTMORTEMS.md` — one 1-paragraph post-mortem per bug found (3 total)
- [ ] `LOG_ANALYSIS.md` — root cause / fix / prevention for each of the 3 incident logs
- [ ] `DECISIONS.md` — 5–15 bullets explaining your non-obvious design choices
- [ ] `AI_USAGE.md` — 3–5 bullets on AI tool usage

## Verification

- [ ] `pnpm build` exits 0 (no TypeScript errors)
- [ ] `pnpm test` exits 0 (smoke tests pass)
- [ ] `pnpm trigger:local fixtures/transcripts.csv` runs without throwing
- [ ] Running trigger-local twice with the same CSV produces the same document count in ES (idempotency)
- [ ] `curl -u elastic:elastic 'http://localhost:9200/evaluation_tenant-a_dev/_count'` shows documents

## Before zipping

- [ ] Remove `node_modules/` and `dist/` from the zip
- [ ] Do not include `.env` (keep `.env.example`)
