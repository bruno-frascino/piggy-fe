import { describe, expect, it } from 'vitest'
import { canonicalizeContract, contractsMatch } from './check-contract.js'

describe('contract freshness comparison', () => {
  it('ignores object key ordering and formatting', () => {
    const source = '{"openapi":"3.0.0","info":{"title":"Piggy","version":"1"}}'
    const vendored = `{
      "info": { "version": "1", "title": "Piggy" },
      "openapi": "3.0.0"
    }`

    expect(contractsMatch(source, vendored)).toBe(true)
  })

  it('detects a changed API contract', () => {
    const source = '{"paths":{"/positions":{"get":{}}}}'
    const vendored = '{"paths":{}}'

    expect(contractsMatch(source, vendored)).toBe(false)
  })

  it('rejects malformed contract JSON', () => {
    expect(() => canonicalizeContract('{')).toThrow(SyntaxError)
  })
})