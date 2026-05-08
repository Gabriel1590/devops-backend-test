import { z } from 'zod'

// EvaluationResult — the structured output the LLM must return.
// This is the v1 schema. The LLM stub respects LLM_API_VERSION:
//   v1 → returns this shape exactly
//   v2 → returns a DIFFERENT shape (see incident-2.log and Part 2 debugging)

export const CategorySchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(10),
  feedback: z.string(),
})

export const EvaluationResultSchema = z.object({
  overallScore: z.number().min(0).max(10),
  categories: z.array(CategorySchema).min(1),
  summary: z.string().min(1),
  flags: z.array(z.string()),
})

export type Category = z.infer<typeof CategorySchema>
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>

// TokenUsage — written to ES after every successful LLM call.
export interface TokenUsage {
  tenantId: string
  contactId: string
  modelVersion: string
  inputTokens: number
  outputTokens: number
  timestamp: string
}

// IngestSummary — returned from the Lambda handler.
export interface IngestSummary {
  fileName: string
  attempted: number
  succeeded: number
  failed: number
  errors: Array<{ contactId: string; reason: string }>
}
