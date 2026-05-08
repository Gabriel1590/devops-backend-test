/**
 * S3 ingest Lambda handler — core implementation.
 *
 * SKELETON — this is the main file you implement.
 *
 * Trigger: s3:ObjectCreated:* on companyx-ingest-{tenantId}-{stage}
 *
 * For each CSV row:
 *   1. Call the LLM stub to evaluate the transcript.
 *   2. Validate the response against EvaluationResultSchema (Zod).
 *      On validation failure → throw StructuredOutputError, count row as failed, continue.
 *   3. Write the EvaluationResult to ES: index=evaluation_{tenantId}_{stage}, _id=contactId.
 *   4. After the ES write succeeds, write token usage to token_usage_{stage}.
 *      This write is a side effect — if it fails, log and continue (do NOT fail the row).
 *
 * Handler return value:
 *   - Always return IngestSummary (even on partial failure).
 *   - Throw FatalIngestError only when the pipeline cannot start at all
 *     (e.g. S3 download failed, ES cluster unreachable for all rows).
 *
 * Logging: use console.info / console.error with the [ingest] tag prefix.
 *   e.g. console.info('[ingest] processing file', key)
 *
 * See README.md for the full requirements and grading rubric overview.
 */

import type { S3Event } from 'aws-lambda'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { parse } from 'csv-parse/sync'
import { EvaluationResultSchema } from '../types/evaluation.js'
import { StructuredOutputError, FatalIngestError } from '../types/errors.js'
import { callLlm } from '../services/llm-stub.js'
import { getPrompt } from '../services/prompt-store-stub.js'
import { writeEvaluation, writeTokenUsage } from '../services/elasticsearch.js'
import { getLlmModelName } from '../services/ssm.js'
import { getIndexName } from '../utils/index-name.js'
import type { TranscriptRow } from '../types/csv-row.js'
import type { IngestSummary, TokenUsage } from '../types/evaluation.js'

// Re-export for trigger-local.ts to import
export { StructuredOutputError, FatalIngestError }

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' })

export async function handler(event: S3Event): Promise<IngestSummary> {
  // TODO: extract bucket and key from event.Records[0].s3

  // TODO: download the CSV from S3 using GetObjectCommand

  // TODO: parse CSV rows into TranscriptRow[]

  // TODO: load LLM model name via getLlmModelName() (demonstrates runtime SSM pattern)

  // TODO: load system prompt via getPrompt('coaching-evaluation')

  // TODO: determine tenantId and stage from env / event metadata

  // TODO: for each row — evaluate, validate, write evaluation, write token usage
  //       accumulate succeeded/failed counts and error details

  // TODO: return IngestSummary

  throw new Error('not implemented')
}
