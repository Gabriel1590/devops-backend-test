/**
 * Slack webhook helper — posts an ingest summary to a Slack-compatible endpoint.
 *
 * SKELETON — implement this as a stretch goal (see README §Stretch Goals).
 *
 * Requirements:
 *   - POST JSON to process.env.SLACK_WEBHOOK_URL
 *   - Body: { text: string } where text summarises { fileName, attempted, succeeded, failed }
 *   - If SLACK_WEBHOOK_URL is not set, log a warning and return without throwing.
 *   - A Slack POST failure must NOT fail the overall Lambda — log and continue.
 */

import type { IngestSummary } from '../types/evaluation.js'

export async function postSummary(_summary: IngestSummary): Promise<void> {
  throw new Error('not implemented')
}
