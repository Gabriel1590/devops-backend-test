# CompanyX — Backend / DevOps Engineer Take-Home

**Time budget:** ~4 hours of focused work. Do not go beyond 5 hours.
**Submission:** zip the project (excluding `node_modules/`) and email it back.

---

## Background

CompanyX runs a multi-tenant AI call-center quality platform. Enterprise tenants deliver daily batches of call transcript exports as CSV files — one row per call. Our pipeline picks these up from S3, evaluates each transcript using an LLM, stores results in Elasticsearch for the coaching dashboard, and tracks token usage for cost accounting.

A recent engineer left behind the skeleton of this pipeline. The provided code has some rough edges and **three known bugs** — part of your job is to find and fix them.

---

## What you are building

This test has three parts. Work through them in order.

### Part 1 — Build the ingest pipeline (~2.5h)

Implement the S3 ingest Lambda in `src/handlers/ingest.ts`. The handler is triggered when a CSV file lands in the tenant's S3 bucket.

**For each row in the CSV, your handler must:**

1. Load the system prompt from the prompt store (`getPrompt('coaching-evaluation')` — provided).
2. Call the LLM stub (`callLlm(...)` — provided) with the system prompt and transcript.
3. Validate the LLM response against `EvaluationResultSchema` (Zod, provided).
   - On validation failure: throw `StructuredOutputError`, count the row as **failed**, and continue to the next row.
4. Write the `EvaluationResult` to Elasticsearch:
   - Index: `evaluation_{tenantId}_{stage}` — use `getIndexName()` from `utils/index-name.ts` (skeleton).
   - Document `_id`: `contactId` — this is your idempotency key.
5. After the ES write succeeds, write token usage to `token_usage_{stage}`:
   - Fields: `tenantId`, `contactId`, `modelVersion`, `inputTokens`, `outputTokens`, `timestamp`.
   - **This is a write-after-success side effect.** If it fails, log the error and continue — never fail the row.

**Handler return value:**

Return an `IngestSummary` (see `src/types/evaluation.ts`) from every call, including on partial failure.
Throw `FatalIngestError` only when the pipeline cannot begin at all (e.g. S3 download failed before any rows were processed, or ES is completely unreachable).

**Implement `getIndexName()` in `src/utils/index-name.ts`:**

Return `{base}_{tenantId}_{stage}`, e.g. `evaluation_tenant-a_dev`.

**Logging:**

Use `console.info` / `console.error` with the `[ingest]` tag prefix on every significant step. Example:
```
[ingest] file=batch_0320.csv rows=12
[ingest] contactId=contact-001 succeeded=true
[ingest] contactId=contact-003 failed reason=StructuredOutputError
[ingest] summary attempted=12 succeeded=10 failed=2
```

**Serverless config:**

Fill in `serverless.functions.yml` with the function definition, timeout, and S3 event trigger.
Fill in the IAM role statements in `serverless.yml` for the permissions your Lambda needs.

**TypeScript requirements:**

- No `any` — use explicit types throughout.
- Explicit return types on all exported functions.

---

### Part 2 — Debug and fix planted bugs (~1h)

Three bugs are planted somewhere in the **provided code** (files marked `PROVIDED`). They range from subtle to obvious.

Find each bug, fix it, and write a 1-paragraph post-mortem for each in `POSTMORTEMS.md`:
- What the bug is and where it lives
- Root cause (why it exists / what assumption is wrong)
- Impact in production (what actually breaks)
- How to prevent this class of bug

Tips for finding them:
- Run `pnpm trigger:local fixtures/transcripts.csv` with `LLM_API_VERSION=v2` and inspect what lands in ES.
- Re-run trigger-local twice with the same CSV — is the result the same?
- Check what happens when the ES `token_usage` write fails.
- Review the Serverless config for any parameter name mismatches.

---

### Part 3 — Analyze CloudWatch log dumps (~0.5h)

Three CloudWatch log excerpts are in the `logs/` folder. Each represents a production incident from a different part of the system. Read each one and write your analysis in `LOG_ANALYSIS.md`.

For each incident, answer in 2–4 sentences:
1. **Root cause** — what went wrong and why?
2. **Fix** — what would you change?
3. **Prevention** — how would you prevent this class of issue in the future?

You do not need to write code for Part 3 — written analysis only.

---

## Stretch goals

Only attempt these after Parts 1–3 are complete and you have time remaining.

- **Slack summary**: implement `src/services/slack.ts` to POST a summary to `SLACK_WEBHOOK_URL` after processing each file.
- **Cost-by-model-version aggregation**: write an Elasticsearch aggregation query (as a `.json` file or inline in `DECISIONS.md`) against `token_usage_dev` that returns total input and output tokens per tenant, broken down by `modelVersion`. This mirrors a real request: "the CEO wants to compare Gemini v1 vs v2 costs per client."
- **Retry with backoff**: instead of swallowing the token-usage write failure, retry up to 3 times with exponential backoff before giving up and logging.

---

## A note on AI tools

You can use AI tools (Copilot, Cursor, ChatGPT, Claude, etc.) freely. We are not trying to catch you. We assume senior engineers use AI as a force multiplier.

What we do care about: that **you** can reason about this system, debug it, and defend your decisions.

To that end, **two files are required in your submission:**

**`DECISIONS.md`** — 5 to 15 short bullets explaining your non-obvious choices. For example:
- Why you chose deploy-time vs runtime SSM for each env var
- Why your error-isolation strategy for the token-usage write
- Why your choice of `_id` for idempotency
- What you would change about the LLM stub if using the real Gemini API

**`AI_USAGE.md`** — 3 to 5 bullets on what you used AI for and what you wrote yourself. We don't penalize use; we penalize lack of judgment.

After submission, **there is a 15-minute walkthrough call**. We will pick 1–2 of your decisions and ask you to walk through them live, plus one of your post-mortems. Be ready to defend your code as its author.

---

## Setup

**Prerequisites:** Docker, Node 20+, pnpm 9+.

```bash
# 1. Start Elasticsearch (takes ~30s to become healthy)
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Set up env
cp .env.example .env
# Edit .env if needed — defaults work out of the box with docker compose

# 4. Verify ES is up
curl -u elastic:elastic http://localhost:9200/_cluster/health

# 5. Run smoke tests (should pass against the unmodified scaffold)
pnpm test

# 6. Run type-check
pnpm build

# 7. After implementing Part 1 — test locally
pnpm trigger:local fixtures/transcripts.csv

# 8. To test the LLM v2 debugging scenario (Part 2):
LLM_API_VERSION=v2 pnpm trigger:local fixtures/transcripts.csv
```

---

## What we grade on

**Part 1 — Build (50 pts)**

| Criterion | Notes |
|---|---|
| Handler compiles and runs end-to-end | Via `pnpm trigger:local` |
| `getIndexName` correct — no hardcoding | Index name must reflect tenantId and stage |
| ES write is idempotent | Same CSV run twice → same doc count, no errors |
| Deploy-time vs runtime SSM split | Correct choice for each param, explained in DECISIONS.md |
| Partial-success vs fatal error distinction | Correct HTTP 200 / throw distinction |
| Token-usage write is genuinely isolated | Catch block logs and continues — not re-throws |
| TypeScript: no `any`, explicit return types | ESLint clean |
| Logging: `[ingest]` tags, useful breadcrumbs | Readable in CloudWatch Logs Insights |

**Part 2 — Debug (30 pts)**

10 pts per bug: correct identification, correct fix, post-mortem addresses root cause and production impact.

**Part 3 — Analyze (15 pts)**

5 pts per incident: root cause accurate, fix actionable, prevention non-trivial.

**DECISIONS.md quality (5 pts)**

Demonstrates reasoning, not AI summaries.

---

## Submission checklist

See `DELIVERABLES.md` for the full checklist before you zip.
