/**
 * Index name utility — derives Elasticsearch index names from tenant and stage.
 *
 * SKELETON — implement this function.
 *
 * Requirements:
 *   - Index names must follow the pattern: {base}_{tenantId}_{stage}
 *     e.g. 'evaluation_tenant-a_dev'
 *   - tenantId and stage must come from parameters / env — never hardcoded.
 *   - Used by the handler to keep per-tenant data isolated across all environments.
 *
 * Why this matters: if getIndexName returns a wrong or hardcoded name, every
 * tenant's evaluations land in the same index, breaking data isolation.
 * The grading rubric checks that your handler uses this function consistently.
 */

export function getIndexName(base: string, tenantId: string, stage: string): string {
  throw new Error('not implemented')
}
