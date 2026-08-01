import { describe, expect, it } from 'vitest'
import { generateContractDrift } from './contract-drift.js'

describe('contract drift', () => {
  it('keeps referenced backend schemas aligned with frontend mirror types', () => {
    const result = generateContractDrift()

    expect(result.driftCount).toBe(0)
    expect(result.content).toContain('Matched to `ApiErrorResponse`')
    expect(result.content).toContain('Matched to `UserProfile`')
  })
})