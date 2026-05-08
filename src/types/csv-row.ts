// Represents one row from the CSV the tenant drops into S3.
export interface TranscriptRow {
  contactId: string
  agentId: string
  callDate: string   // ISO 8601 date string, e.g. "2024-03-15"
  transcript: string // Full call transcript text
}
