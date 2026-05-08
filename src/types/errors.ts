// Thrown when the LLM returns a response that fails Zod schema validation.
// Distinguishes structured-output failures from network / auth failures.
export class StructuredOutputError extends Error {
  constructor(
    message: string,
    public readonly contactId: string,
    public readonly rawResponse: string,
  ) {
    super(message)
    this.name = 'StructuredOutputError'
  }
}

// Thrown when the ingest pipeline cannot proceed at all —
// e.g. the S3 download failed before any rows were processed,
// or the ES cluster is unreachable for all writes.
// A FatalIngestError should cause the Lambda to return a non-200 status.
export class FatalIngestError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'FatalIngestError'
  }
}
