/**
 * Elasticsearch service — singleton client and write helpers.
 *
 * PROVIDED — read carefully. This file contains one of the planted bugs
 * you must find and fix in Part 2. Treat it as production code that has
 * shipped and produced an incident; you may edit it to fix the bug.
 */

import { Client } from '@elastic/elasticsearch'
import type { EvaluationResult, TokenUsage } from '../types/evaluation.js'

let _client: Client | null = null

export function getClient(): Client {
  if (!_client) {
    _client = new Client({
      node: process.env.ES_URL ?? 'http://localhost:9200',
      auth: {
        username: process.env.ES_USERNAME ?? 'elastic',
        password: process.env.ES_PASSWORD ?? 'elastic',
      },
      // ES 8.x client connects to 7.17 cluster via basic auth
    })
  }
  return _client
}

export async function writeEvaluation(params: {
  indexName: string
  contactId: string
  tenantId: string
  result: EvaluationResult
}): Promise<void> {
  const client = getClient()

  // op_type defaults to 'index' → upsert by _id, which is what idempotency requires:
  // re-processing the same row (or a duplicate contactId within the same CSV)
  // overwrites the existing document instead of throwing version_conflict.
  await client.index({
    index: params.indexName,
    id: params.contactId,
    document: {
      tenantId: params.tenantId,
      contactId: params.contactId,
      ...params.result,
      indexedAt: new Date().toISOString(),
    },
  })
}

export async function writeTokenUsage(usage: TokenUsage): Promise<void> {
  const client = getClient()

  try {
    await client.index({
      index: `token_usage_${process.env.STAGE ?? 'dev'}`,
      document: {
        ...usage,
        timestamp: usage.timestamp,
      },
    })
  } catch (_err) {
    // write-after-success side effect — must not surface to caller
  }
}
