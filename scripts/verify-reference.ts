/**
 * End-to-end verification script — runs the REFERENCE SOLUTION against real Elasticsearch.
 * Shows exactly what a correct candidate submission would produce.
 *
 * INTERVIEWER USE ONLY — do not bundle in candidate-test.zip
 *
 * Usage (from candidate-test/ with docker compose up -d):
 *   pnpm tsx scripts/verify-reference.ts
 */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import { sdkStreamMixin } from '@aws-sdk/util-stream-node'
import { Client } from '@elastic/elasticsearch'
import type { S3Event } from 'aws-lambda'

process.env.STAGE = 'dev'
process.env.TENANT_ID = 'tenant-a'
process.env.LLM_API_VERSION = 'v1'
process.env.LLM_MODEL_NAME = 'gemini-1.5-pro'
process.env.INGEST_BUCKET = 'companyx-ingest-tenant-a-dev'

const CSV_PATH = path.resolve('fixtures/transcripts.csv')
const REF_HANDLER = path.resolve('../_internal/reference-solution/src/handlers/ingest.js')
const ES_URL = process.env.ES_URL ?? 'http://localhost:9200'
const ES_AUTH = { username: process.env.ES_USERNAME ?? 'elastic', password: process.env.ES_PASSWORD ?? 'elastic' }

async function waitForEs(maxWaitMs = 60_000): Promise<void> {
  const es = new Client({ node: ES_URL, auth: ES_AUTH })
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    try {
      const health = await es.cluster.health()
      if (['green', 'yellow'].includes(health.status)) {
        console.log(`[verify] ES healthy (status=${health.status})`)
        return
      }
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 2000))
    process.stdout.write('.')
  }
  throw new Error('ES did not become healthy within timeout')
}

async function countDocs(indexPattern: string): Promise<number> {
  const es = new Client({ node: ES_URL, auth: ES_AUTH })
  try {
    const resp = await es.count({ index: indexPattern })
    return resp.count
  } catch { return 0 }
}

async function main(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════')
  console.log('  REFERENCE SOLUTION — full end-to-end verification')
  console.log('══════════════════════════════════════════════════\n')

  // ── Wait for ES ───────────────────────────────────────────────────────────
  process.stdout.write('[verify] waiting for Elasticsearch')
  await waitForEs()

  // ── Mock S3 and SSM (no AWS account needed) ───────────────────────────────
  const s3Mock = mockClient(S3Client)
  const freshStream = () => sdkStreamMixin(fs.createReadStream(CSV_PATH)) as never
  s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: freshStream(), ContentLength: fs.statSync(CSV_PATH).size }))

  const ssmMock = mockClient(SSMClient)
  ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: 'gemini-1.5-pro' } })

  // ── Import handler ────────────────────────────────────────────────────────
  const { handler } = await import(REF_HANDLER) as { handler: (e: S3Event) => Promise<unknown> }

  const makeEvent = (): S3Event => ({
    Records: [{
      eventVersion: '2.1', eventSource: 'aws:s3', awsRegion: 'us-east-1',
      eventTime: new Date().toISOString(), eventName: 'ObjectCreated:Put',
      userIdentity: { principalId: 'local' },
      requestParameters: { sourceIPAddress: '127.0.0.1' },
      responseElements: { 'x-amz-request-id': 'local', 'x-amz-id-2': 'local' },
      s3: {
        s3SchemaVersion: '1.0', configurationId: 'local',
        bucket: { name: 'companyx-ingest-tenant-a-dev', ownerIdentity: { principalId: 'local' }, arn: 'arn:aws:s3:::companyx-ingest-tenant-a-dev' },
        object: { key: 'exports/2024-03-20/transcripts.csv', size: fs.statSync(CSV_PATH).size, eTag: 'local', sequencer: 'local' },
      },
    }],
  })

  // ── Run 1 ─────────────────────────────────────────────────────────────────
  console.log('\n── Run 1 (LLM_API_VERSION=v1) ───────────────────')
  const run1 = await handler(makeEvent())
  console.log(JSON.stringify(run1, null, 2))

  const evalCount1 = await countDocs('evaluation_tenant-a_dev')
  const tokenCount1 = await countDocs('token_usage_dev')
  console.log(`\nES after run 1: evaluation_tenant-a_dev=${evalCount1} docs, token_usage_dev=${tokenCount1} docs`)

  // ── Run 2 — idempotency ───────────────────────────────────────────────────
  console.log('\n── Run 2 (same CSV — idempotency check) ─────────')
  s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: freshStream(), ContentLength: fs.statSync(CSV_PATH).size }))
  const run2 = await handler(makeEvent())
  console.log(JSON.stringify(run2, null, 2))

  const evalCount2 = await countDocs('evaluation_tenant-a_dev')
  const tokenCount2 = await countDocs('token_usage_dev')
  console.log(`\nES after run 2: evaluation_tenant-a_dev=${evalCount2} docs (should = ${evalCount1}), token_usage_dev=${tokenCount2}`)
  console.log(`Idempotency: ${evalCount1 === evalCount2 ? '✓ PASS — same doc count' : '✗ FAIL — count changed!'}`)

  // ── Run 3 — v2 LLM version ───────────────────────────────────────────────
  console.log('\n── Run 3 (LLM_API_VERSION=v2 — what a candidate sees without Bug A fix) ──')
  process.env.LLM_API_VERSION = 'v2'
  s3Mock.on(GetObjectCommand).callsFake(() => ({ Body: freshStream(), ContentLength: fs.statSync(CSV_PATH).size }))
  const run3 = await handler(makeEvent())
  console.log(`succeeded=${String((run3 as {succeeded:number}).succeeded)} failed=${String((run3 as {failed:number}).failed)}`)
  console.log('(reference solution handles v2 because Bug A is fixed; unfixed candidate code fails all rows)')

  console.log('\n══════════════════════════════════════════════════')
  console.log('  All checks complete. Review output above.')
  console.log('══════════════════════════════════════════════════\n')
}

main().catch((err: unknown) => { console.error(err); process.exit(1) })
