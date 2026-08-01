import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { stableStringify } from './lib/manifest.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const VENDORED_CONTRACT_PATH = path.join(ROOT, 'contracts', 'openapi.json')

function resolveApiRepoPath(): string {
  const override = process.env.PIGGY_API_PATH
  if (override) return path.resolve(override)
  return path.resolve(ROOT, '..', 'piggy-api')
}

export function canonicalizeContract(content: string): string {
  const parsed: unknown = JSON.parse(content)
  return stableStringify(parsed)
}

export function contractsMatch(sourceContent: string, vendoredContent: string): boolean {
  return canonicalizeContract(sourceContent) === canonicalizeContract(vendoredContent)
}

function fail(message: string): never {
  console.error(`\n✖ contract:check failed: ${message}\n`)
  process.exit(1)
}

function main(): void {
  const apiRepoPath = resolveApiRepoPath()
  const sourceContractPath = path.join(apiRepoPath, 'context', 'openapi.json')

  if (!existsSync(sourceContractPath)) {
    fail(
      `backend contract not found at "${sourceContractPath}".\n` +
        'Provide a piggy-api checkout with generated context, or set PIGGY_API_PATH.'
    )
  }
  if (!existsSync(VENDORED_CONTRACT_PATH)) {
    fail('contracts/openapi.json is missing. Run `yarn contract:pull`.')
  }

  let matches = false
  try {
    matches = contractsMatch(
      readFileSync(sourceContractPath, 'utf8'),
      readFileSync(VENDORED_CONTRACT_PATH, 'utf8')
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`could not parse an OpenAPI contract: ${message}`)
  }

  if (!matches) {
    fail(
      'contracts/openapi.json differs from piggy-api/context/openapi.json.\n' +
        'Run `yarn contract:pull`, inspect the contract and generated type drift, then commit the result.'
    )
  }

  console.log('✓ Vendored OpenAPI contract matches piggy-api.')
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  main()
}