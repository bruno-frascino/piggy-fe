/**
 * Generates context/api-binding.md and context/data-flow.md:
 * - api-binding.md: for each hook in src/hooks/api.ts, which apiClient method(s) it calls
 *   and (for mutations) which query keys it invalidates. Flags apiClient methods with no
 *   hook at all.
 * - data-flow.md: the query-key catalog — which hooks read a key, which mutations
 *   invalidate it.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Project, SyntaxKind } from 'ts-morph'
import { writeArtifact } from './lib/manifest.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const HOOKS_FILE = path.join(ROOT, 'src', 'hooks', 'api.ts')
export const BINDING_OUTPUT_PATH = path.join(ROOT, 'context', 'api-binding.md')
export const DATA_FLOW_OUTPUT_PATH = path.join(ROOT, 'context', 'data-flow.md')

interface HookEntry {
  name: string
  kind: 'query' | 'mutation'
  apiMethods: string[]
  queryKeys: string[]
  invalidates: string[]
  line: number
}

/** Collect every `apiClient.<method>` method name defined by the src/lib/api/* factories. */
function collectApiClientMethods(project: Project): Set<string> {
  const methods = new Set<string>()
  const apiFiles = project.getSourceFiles(['src/lib/api/*.ts'])
  for (const sourceFile of apiFiles) {
    for (const fn of sourceFile.getFunctions()) {
      if (!fn.getName()?.startsWith('create')) continue
      const body = fn.getBody()
      if (!body?.isKind(SyntaxKind.Block)) continue
      // Only the function's own top-level return statement — do NOT descend into nested
      // method bodies, which may have their own unrelated `return {...}` (e.g. mock data).
      const returnStatement = body
        .getStatements()
        .find((s) => s.isKind(SyntaxKind.ReturnStatement))
        ?.asKind(SyntaxKind.ReturnStatement)
      const objectLiteral = returnStatement
        ?.getExpression()
        ?.asKind(SyntaxKind.ObjectLiteralExpression)
      if (!objectLiteral) continue
      for (const prop of objectLiteral.getProperties()) {
        const name =
          prop.asKind(SyntaxKind.MethodDeclaration)?.getName() ??
          prop.asKind(SyntaxKind.PropertyAssignment)?.getName() ??
          prop.asKind(SyntaxKind.ShorthandPropertyAssignment)?.getName()
        if (name) methods.add(name)
      }
    }
  }
  return methods
}

function extractQueryKeys(text: string): string[] {
  const keys: string[] = []
  const regex = /queryKey:\s*\[([^\]]*)\]/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(text))) {
    keys.push(`[${m[1].replace(/\s+/g, ' ').trim()}]`)
  }
  return keys
}

function extractInvalidatedKeys(text: string): string[] {
  const keys: string[] = []
  const regex = /invalidateQueries\(\s*\{\s*queryKey:\s*\[([^\]]*)\]/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(text))) {
    keys.push(`[${m[1].replace(/\s+/g, ' ').trim()}]`)
  }
  return keys
}

function extractApiMethods(text: string): string[] {
  const methods = new Set<string>()
  const regex = /apiClient\.(\w+)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(text))) methods.add(m[1])
  return [...methods]
}

export function generateApiBinding(): {
  hooks: HookEntry[]
  unboundMethods: string[]
  calledFromOtherHooks: Map<string, string[]>
} {
  const project = new Project({ tsConfigFilePath: path.join(ROOT, 'tsconfig.json') })
  const sourceFile = project.addSourceFileAtPath(HOOKS_FILE)
  const allMethods = collectApiClientMethods(project)

  const hooks: HookEntry[] = []
  for (const varStatement of sourceFile.getVariableStatements()) {
    if (!varStatement.isExported()) continue
    for (const decl of varStatement.getDeclarations()) {
      const name = decl.getName()
      if (!name.startsWith('use')) continue
      const text = decl.getInitializer()?.getText() ?? ''
      const kind: 'query' | 'mutation' = text.includes('useMutation') ? 'mutation' : 'query'
      hooks.push({
        name,
        kind,
        apiMethods: extractApiMethods(text),
        queryKeys: extractQueryKeys(text),
        invalidates: extractInvalidatedKeys(text),
        line: decl.getStartLineNumber(),
      })
    }
  }

  // Some Phase 0 extracted hooks (e.g. useSymbolSearch.ts, useHoldingRows.ts) call apiClient
  // directly rather than going through src/hooks/api.ts — scan all of src/hooks/** so the
  // "unbound" report doesn't falsely flag methods that ARE used, just not centrally.
  const calledFromOtherHooks = new Map<string, string[]>()
  const otherHookFiles = project
    .getSourceFiles(['src/hooks/**/*.ts'])
    .filter((sf) => sf.getFilePath() !== HOOKS_FILE && !sf.getFilePath().endsWith('.test.ts'))
  for (const sf of otherHookFiles) {
    const relPath = path.relative(ROOT, sf.getFilePath())
    for (const method of extractApiMethods(sf.getFullText())) {
      const files = calledFromOtherHooks.get(method) ?? []
      files.push(relPath)
      calledFromOtherHooks.set(method, files)
    }
  }

  const usedMethods = new Set(hooks.flatMap((h) => h.apiMethods))
  const unboundMethods = [...allMethods]
    .filter((m) => !usedMethods.has(m) && !calledFromOtherHooks.has(m))
    .sort()

  return { hooks, unboundMethods, calledFromOtherHooks }
}

export function buildBindingMarkdown(
  hooks: HookEntry[],
  unboundMethods: string[],
  calledFromOtherHooks: Map<string, string[]>
): string {
  const lines: string[] = [
    '# API binding',
    '',
    "> Generated by `scripts/context/api-binding.ts` — do not hand-edit. Run `yarn context:build`.",
    '',
    '| Hook | Kind | apiClient method(s) | Query key(s) | Invalidates | Location |',
    '| ---- | ---- | -------------------- | ------------- | ----------- | -------- |',
    ...hooks.map(
      (h) =>
        `| \`${h.name}\` | ${h.kind} | ${h.apiMethods.join(', ') || '—'} | ${
          h.queryKeys.join(', ') || '—'
        } | ${h.invalidates.join(', ') || '—'} | [src/hooks/api.ts:${h.line}](../src/hooks/api.ts#L${h.line}) |`
    ),
    '',
  ]

  if (calledFromOtherHooks.size > 0) {
    lines.push(
      '## apiClient methods called from other hooks (not src/hooks/api.ts)',
      '',
      'These bypass the central React Query hook layer — no cache/query-key wiring for them.',
      ''
    )
    for (const [method, files] of [...calledFromOtherHooks.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`- \`${method}\` — called from ${[...new Set(files)].map((f) => `[${f}](../${f})`).join(', ')}`)
    }
    lines.push('')
  }

  lines.push(
    '## apiClient methods with no hook',
    '',
    unboundMethods.length > 0
      ? unboundMethods.map((m) => `- \`${m}\` — no hook in src/hooks/** calls this method.`).join('\n')
      : 'None — every apiClient method is called from at least one hook. ✅',
    ''
  )
  return lines.join('\n')
}

export function buildDataFlowMarkdown(hooks: HookEntry[]): string {
  const keyOwners = new Map<string, { readers: string[]; invalidators: string[] }>()
  for (const hook of hooks) {
    for (const key of hook.queryKeys) {
      const entry = keyOwners.get(key) ?? { readers: [], invalidators: [] }
      entry.readers.push(hook.name)
      keyOwners.set(key, entry)
    }
    for (const key of hook.invalidates) {
      const entry = keyOwners.get(key) ?? { readers: [], invalidators: [] }
      entry.invalidators.push(hook.name)
      keyOwners.set(key, entry)
    }
  }

  const lines: string[] = [
    '# Data flow (query key catalog)',
    '',
    "> Generated by `scripts/context/api-binding.ts` — do not hand-edit. Run `yarn context:build`.",
    '',
    '| Query key | Read by | Invalidated by |',
    '| --------- | ------- | --------------- |',
    ...[...keyOwners.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, e]) => `| \`${key}\` | ${e.readers.join(', ') || '—'} | ${e.invalidators.join(', ') || '—'} |`),
    '',
  ]
  return lines.join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { hooks, unboundMethods, calledFromOtherHooks } = generateApiBinding()
  const bindingSha = writeArtifact(
    BINDING_OUTPUT_PATH,
    buildBindingMarkdown(hooks, unboundMethods, calledFromOtherHooks)
  )
  const flowSha = writeArtifact(DATA_FLOW_OUTPUT_PATH, buildDataFlowMarkdown(hooks))
  console.log(
    `Wrote context/api-binding.md (${hooks.length} hooks, ${unboundMethods.length} unbound methods, sha256 ${bindingSha.slice(0, 12)}...) and context/data-flow.md (sha256 ${flowSha.slice(0, 12)}...)`
  )
}
