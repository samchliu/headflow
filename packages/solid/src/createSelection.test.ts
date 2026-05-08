import { describe, expect, it } from 'vitest'
import {
  createFlowCanvas,
  createNode,
  createHandle,
  createEdges,
  createSelection,
  createLasso,
} from './index'

/**
 * SolidJS reactive primitives (onMount, createSignal…) require a SolidJS
 * owner to be active when called. Running them without `createRoot` throws
 * "computations created outside a `createRoot`…".
 *
 * The authoritative integration tests for SolidJS adapters live in
 * `apps/stress-test/` (Playwright).
 * These tests verify the module contract and export shapes, which is enough
 * to catch typos, broken imports, and API surface regressions in CI.
 */

describe('@headflow/solid exports', () => {
  it('exports createFlowCanvas as a function', () => {
    expect(typeof createFlowCanvas).toBe('function')
  })

  it('exports createNode as a function', () => {
    expect(typeof createNode).toBe('function')
  })

  it('exports createHandle as a function', () => {
    expect(typeof createHandle).toBe('function')
  })

  it('exports createEdges as a function', () => {
    expect(typeof createEdges).toBe('function')
  })

  it('exports createSelection as a function', () => {
    expect(typeof createSelection).toBe('function')
  })

  it('exports createLasso as a function', () => {
    expect(typeof createLasso).toBe('function')
  })
})
