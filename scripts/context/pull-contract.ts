/**
 * yarn contract:pull — DEVELOPER-MACHINE ONLY. Copies the sibling piggy-api repo's
 * context/openapi.json into piggy-fe/contracts/openapi.json (committed), plus a small
 * openapi.meta.json recording which piggy-api commit it came from.
 *
 * This is deliberately NOT part of `yarn context:build` (see contracts/README.md and
 * AGENTS.md's cross-repo ordering rule): CI has no sibling checkout, so context:build must
 * work purely from whatever contract is already committed. If the sibling repo can't be
 * found, this script fails loudly rather than silently leaving the stale vendored copy in
 * place — it never touches contracts/ unless the pull actually succeeds.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const CONTRACTS_DIR = path.join(ROOT, 'contracts')

function resolveApiRepoPath(): string {
  const override = process.env.PIGGY_API_PATH
  if (override) return path.resolve(override)
  return path.resolve(ROOT, '..', 'piggy-api')
}

function fail(message: string): never {
  console.error(`\n✖ contract:pull failed: ${message}\n`)
  process.exit(1)
}

function main(): void {
  const apiRepoPath = resolveApiRepoPath()
  const sourceOpenapiPath = path.join(apiRepoPath, 'context', 'openapi.json')

  if (!existsSync(apiRepoPath)) {
    fail(
      `piggy-api repo not found at "${apiRepoPath}".\n` +
        `Expected it as a sibling checkout (../piggy-api relative to this repo), or set\n` +
        `PIGGY_API_PATH=/absolute/path/to/piggy-api to override.`
    )
  }
  if (!existsSync(sourceOpenapiPath)) {
    fail(
      `Found piggy-api at "${apiRepoPath}" but it has no context/openapi.json.\n` +
        `Run \`yarn context:build\` in that repo first.`
    )
  }

  let sourceCommitSha = 'unknown'
  try {
    sourceCommitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: apiRepoPath,
      encoding: 'utf8',
    }).trim()
  } catch {
    console.warn('⚠ Could not read piggy-api\'s git HEAD (not a git repo, or git unavailable) — recording "unknown".')
  }

  const openapiContent = readFileSync(sourceOpenapiPath, 'utf8')
  mkdirSync(CONTRACTS_DIR, { recursive: true })
  writeFileSync(path.join(CONTRACTS_DIR, 'openapi.json'), openapiContent, 'utf8')
  writeFileSync(
    path.join(CONTRACTS_DIR, 'openapi.meta.json'),
    JSON.stringify(
      {
        sourceCommitSha,
        sourceRepoPath: apiRepoPath,
        pulledAt: new Date().toISOString(),
      },
      null,
      2
    ) + '\n',
    'utf8'
  )

  console.log(`✓ Pulled contracts/openapi.json from piggy-api@${sourceCommitSha.slice(0, 12)}`)
  console.log('  Next: run `yarn context:build` to regenerate generated/api-types.ts + contract-drift.md.')
}

main()
