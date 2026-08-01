/**
 * Generates src/lib/generated/api-types.ts from the vendored contracts/openapi.json via
 * openapi-typescript. Purely local/deterministic (no network, no sibling checkout needed —
 * that's `yarn contract:pull`'s job). REFERENCE ONLY: app code must never import this file
 * directly (see ADR 0007 in docs/adr/) — src/lib/types.ts remains the manually mirrored
 * source of truth. This generator's only consumer is contract-drift.ts.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import openapiTS, { astToString } from 'openapi-typescript'
import { writeArtifact } from './lib/manifest.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const CONTRACT_PATH = path.join(ROOT, 'contracts', 'openapi.json')
export const OUTPUT_PATH = path.join(ROOT, 'src', 'lib', 'generated', 'api-types.ts')

export function contractExists(): boolean {
  return existsSync(CONTRACT_PATH)
}

/** Pure: returns the generated TypeScript source, does not touch disk. */
export async function generateApiTypes(): Promise<{ content: string }> {
  const ast = await openapiTS(new URL(`file://${CONTRACT_PATH}`))
  const header = [
    '/**',
    ' * GENERATED from contracts/openapi.json by scripts/context/generate-api-types.ts.',
    ' * REFERENCE ONLY — never import this file from app code (components/hooks/pages).',
    ' * src/lib/types.ts is the manually mirrored source of truth (see docs/adr/0007-manual-types-mirror.md).',
    ' * See context/contract-drift.md for a report of any drift between the two.',
    ' */',
    '',
  ].join('\n')
  return { content: header + astToString(ast) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!contractExists()) {
    console.error('contracts/openapi.json not found — run `yarn contract:pull` first (dev-machine only).')
    process.exit(1)
  }
  const { content } = await generateApiTypes()
  const sha256 = writeArtifact(OUTPUT_PATH, content)
  console.log(`Wrote src/lib/generated/api-types.ts (sha256 ${sha256.slice(0, 12)}...)`)
}
