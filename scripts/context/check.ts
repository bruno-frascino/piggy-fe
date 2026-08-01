/**
 * Drift check: re-runs every context/ generator (pure, no disk writes of their own),
 * writes the results into a throwaway temp directory, and compares sha256 hashes against
 * the committed context/manifest.json (ignoring `generatedAt`). Exits 1 and prints the
 * offending artifact names if anything differs. Never writes into the real context/
 * directory. Used by the pre-push hook and CI's context-drift job.
 */
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { stableStringify, writeArtifact, type Manifest } from './lib/manifest.js'
import { generateRouteMap } from './route-map.js'
import { generateComponentIndex } from './component-index.js'
import { generateApiBinding, buildBindingMarkdown, buildDataFlowMarkdown } from './api-binding.js'
import { generateSymbolIndex } from './symbol-index.js'
import { generateModuleGraph, buildMarkdownSummary } from './module-graph.js'
import { generateUnusedReport } from './unused.js'
import { generateApiTypes, contractExists } from './generate-api-types.js'
import { generateContractDrift } from './contract-drift.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const COMMITTED_MANIFEST_PATH = path.join(ROOT, 'context', 'manifest.json')
const ACCEPTED_ARCHITECTURE_VIOLATIONS = new Set([
  'components-app-no-direct-api-client:src/app/history/page.tsx->src/lib/api-client.ts',
  'components-app-no-direct-api-client:src/components/HoldingsTable.tsx->src/lib/api-client.ts',
  'components-app-no-direct-api-client:src/components/ReportsView.tsx->src/lib/api-client.ts',
  'components-app-no-direct-api-client:src/components/TopNav.tsx->src/lib/api-client.ts',
])

async function buildIntoTempDir(tempContextDir: string): Promise<{
  hashes: Record<string, string>
  architectureViolations: string[]
}> {
  const entries: Record<string, string> = {}

  entries['route-map.md'] = writeArtifact(path.join(tempContextDir, 'route-map.md'), generateRouteMap().content)
  entries['component-index.md'] = writeArtifact(
    path.join(tempContextDir, 'component-index.md'),
    generateComponentIndex().content
  )

  const { hooks, unboundMethods, calledFromOtherHooks } = generateApiBinding()
  entries['api-binding.md'] = writeArtifact(
    path.join(tempContextDir, 'api-binding.md'),
    buildBindingMarkdown(hooks, unboundMethods, calledFromOtherHooks)
  )
  entries['data-flow.md'] = writeArtifact(path.join(tempContextDir, 'data-flow.md'), buildDataFlowMarkdown(hooks))

  entries['symbol-index.json'] = writeArtifact(
    path.join(tempContextDir, 'symbol-index.json'),
    stableStringify(generateSymbolIndex().entries)
  )

  const moduleGraph = await generateModuleGraph()
  const architectureViolations = moduleGraph.result.modules.flatMap((module) =>
    (module.dependencies ?? []).flatMap((dependency) =>
      (dependency.rules ?? []).map(
        (rule) => `${rule.name}:${module.source}->${dependency.resolved}`
      )
    )
  )
  entries['module-graph.json'] = writeArtifact(
    path.join(tempContextDir, 'module-graph.json'),
    stableStringify(moduleGraph.result)
  )
  entries['module-graph.md'] = writeArtifact(
    path.join(tempContextDir, 'module-graph.md'),
    buildMarkdownSummary(moduleGraph.result, moduleGraph.violationCount)
  )

  entries['unused.json'] = writeArtifact(
    path.join(tempContextDir, 'unused.json'),
    stableStringify(generateUnusedReport().report)
  )

  if (contractExists()) {
    entries['api-types.ts'] = writeArtifact(
      path.join(tempContextDir, 'api-types.ts'),
      (await generateApiTypes()).content
    )
    entries['contract-drift.md'] = writeArtifact(
      path.join(tempContextDir, 'contract-drift.md'),
      generateContractDrift().content
    )
  }

  return { hashes: entries, architectureViolations }
}

async function main(): Promise<void> {
  if (!existsSync(COMMITTED_MANIFEST_PATH)) {
    console.error('context/manifest.json does not exist — run `yarn context:build` first.')
    process.exitCode = 1
    return
  }

  const committed = JSON.parse(readFileSync(COMMITTED_MANIFEST_PATH, 'utf8')) as Manifest
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'piggy-fe-context-check-'))

  try {
    const { hashes: freshHashes, architectureViolations } = await buildIntoTempDir(tempDir)
    const stale: string[] = []
    const newArchitectureViolations = architectureViolations.filter(
      (violation) => !ACCEPTED_ARCHITECTURE_VIOLATIONS.has(violation)
    )

    for (const [name, entry] of Object.entries(committed.artifacts)) {
      if (freshHashes[name] === undefined) continue
      if (freshHashes[name] !== entry.sha256) stale.push(name)
    }
    for (const name of Object.keys(freshHashes)) {
      if (!(name in committed.artifacts)) stale.push(name)
    }

    let failed = false
    if (stale.length > 0) {
      console.error('context/ is stale. Out-of-date or missing artifacts:')
      for (const name of [...new Set(stale)]) console.error(`  - ${name}`)
      console.error('\nRun `yarn context:build`, then `git add context/` and commit.')
      failed = true
    }
    if (newArchitectureViolations.length > 0) {
      console.error('Found architecture rule violations outside the accepted baseline:')
      for (const violation of newArchitectureViolations) console.error(`  - ${violation}`)
      failed = true
    }
    if (failed) {
      process.exitCode = 1
    } else {
      console.log('context/ is up to date. ✅')
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

await main()
