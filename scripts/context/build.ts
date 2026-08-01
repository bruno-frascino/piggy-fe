/**
 * Runs every context/ generator and writes context/manifest.json (sha256 per artifact).
 * This is the single command agents/CI run after any src/ or route change.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeArtifact, writeManifest, stableStringify, type ManifestEntry } from './lib/manifest.js'
import { generateRouteMap, OUTPUT_PATH as ROUTE_MAP_PATH } from './route-map.js'
import { generateComponentIndex, OUTPUT_PATH as COMPONENT_INDEX_PATH } from './component-index.js'
import {
  generateApiBinding,
  buildBindingMarkdown,
  buildDataFlowMarkdown,
  BINDING_OUTPUT_PATH,
  DATA_FLOW_OUTPUT_PATH,
} from './api-binding.js'
import { generateSymbolIndex, OUTPUT_PATH as SYMBOL_INDEX_PATH } from './symbol-index.js'
import {
  generateModuleGraph,
  buildMarkdownSummary,
  JSON_OUTPUT_PATH as MODULE_GRAPH_JSON_PATH,
  MD_OUTPUT_PATH as MODULE_GRAPH_MD_PATH,
} from './module-graph.js'
import { generateUnusedReport, OUTPUT_PATH as UNUSED_PATH } from './unused.js'
import { generateApiTypes, contractExists, OUTPUT_PATH as API_TYPES_PATH } from './generate-api-types.js'
import { generateContractDrift, OUTPUT_PATH as CONTRACT_DRIFT_PATH } from './contract-drift.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const MANIFEST_PATH = path.join(ROOT, 'context', 'manifest.json')

function relKey(absPath: string): string {
  return path.relative(ROOT, absPath)
}

async function main(): Promise<void> {
  const entries: Record<string, ManifestEntry> = {}
  let hadArchitectureViolations = false

  const routeMap = generateRouteMap()
  entries['route-map.md'] = { path: relKey(ROUTE_MAP_PATH), sha256: writeArtifact(ROUTE_MAP_PATH, routeMap.content) }

  const componentIndex = generateComponentIndex()
  entries['component-index.md'] = {
    path: relKey(COMPONENT_INDEX_PATH),
    sha256: writeArtifact(COMPONENT_INDEX_PATH, componentIndex.content),
  }

  const { hooks, unboundMethods, calledFromOtherHooks } = generateApiBinding()
  entries['api-binding.md'] = {
    path: relKey(BINDING_OUTPUT_PATH),
    sha256: writeArtifact(BINDING_OUTPUT_PATH, buildBindingMarkdown(hooks, unboundMethods, calledFromOtherHooks)),
  }
  entries['data-flow.md'] = {
    path: relKey(DATA_FLOW_OUTPUT_PATH),
    sha256: writeArtifact(DATA_FLOW_OUTPUT_PATH, buildDataFlowMarkdown(hooks)),
  }

  const symbolIndex = generateSymbolIndex()
  entries['symbol-index.json'] = {
    path: relKey(SYMBOL_INDEX_PATH),
    sha256: writeArtifact(SYMBOL_INDEX_PATH, stableStringify(symbolIndex.entries)),
  }

  const moduleGraph = await generateModuleGraph()
  entries['module-graph.json'] = {
    path: relKey(MODULE_GRAPH_JSON_PATH),
    sha256: writeArtifact(MODULE_GRAPH_JSON_PATH, stableStringify(moduleGraph.result)),
  }
  entries['module-graph.md'] = {
    path: relKey(MODULE_GRAPH_MD_PATH),
    sha256: writeArtifact(
      MODULE_GRAPH_MD_PATH,
      buildMarkdownSummary(moduleGraph.result, moduleGraph.violationCount)
    ),
  }
  if (moduleGraph.violationCount > 0) hadArchitectureViolations = true

  const unused = generateUnusedReport()
  entries['unused.json'] = {
    path: relKey(UNUSED_PATH),
    sha256: writeArtifact(UNUSED_PATH, stableStringify(unused.report)),
  }

  if (contractExists()) {
    const apiTypes = await generateApiTypes()
    entries['api-types.ts'] = {
      path: relKey(API_TYPES_PATH),
      sha256: writeArtifact(API_TYPES_PATH, apiTypes.content),
    }

    const contractDrift = generateContractDrift()
    entries['contract-drift.md'] = {
      path: relKey(CONTRACT_DRIFT_PATH),
      sha256: writeArtifact(CONTRACT_DRIFT_PATH, contractDrift.content),
    }
  } else {
    console.warn(
      '⚠ contracts/openapi.json not found — skipping api-types.ts + contract-drift.md.\n' +
        '  Run `yarn contract:pull` (dev-machine only) to vendor it from ../piggy-api.'
    )
  }

  writeManifest(MANIFEST_PATH, entries)

  console.log(`context:build wrote ${Object.keys(entries).length} artifacts + manifest.json`)
  if (hadArchitectureViolations) {
    console.error(
      `⚠ ${moduleGraph.violationCount} architecture rule violation(s) — see context/module-graph.md`
    )
    process.exitCode = 1
  }
}

await main()
