import { describe, expect, it, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { createFlow } from '@headflow/core'
import type { FlowEngine } from '@headflow/core'
import { FlowContext } from './context'
import { useSelection } from './useSelection'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeContainer() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function makeWrapper(engine: FlowEngine) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      FlowContext.Provider,
      { value: { getEngine: () => engine } },
      children,
    )
  }
}

function makeEngine() {
  const container = makeContainer()
  const engine = createFlow({ container })

  const n1 = document.createElement('div')
  const n2 = document.createElement('div')
  container.appendChild(n1)
  container.appendChild(n2)
  engine.registerNode('n1', n1, { x: 0, y: 0 })
  engine.registerNode('n2', n2, { x: 100, y: 0 })

  return { engine, container }
}

afterEach(() => {
  cleanup()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSelection', () => {
  it('returns empty set initially', () => {
    const { engine, container } = makeEngine()

    const { result } = renderHook(() => useSelection(), {
      wrapper: makeWrapper(engine),
    })

    expect(result.current.size).toBe(0)

    engine.destroy()
    document.body.removeChild(container)
  })

  it('updates when selectNode is called', () => {
    const { engine, container } = makeEngine()

    const { result } = renderHook(() => useSelection(), {
      wrapper: makeWrapper(engine),
    })

    act(() => {
      engine.selectNode('n1')
    })

    expect(result.current.has('n1')).toBe(true)
    expect(result.current.size).toBe(1)

    engine.destroy()
    document.body.removeChild(container)
  })

  it('updates when clearSelection is called', () => {
    const { engine, container } = makeEngine()

    act(() => {
      engine.selectNodes(['n1', 'n2'])
    })

    const { result } = renderHook(() => useSelection(), {
      wrapper: makeWrapper(engine),
    })

    act(() => {
      engine.clearSelection()
    })

    expect(result.current.size).toBe(0)

    engine.destroy()
    document.body.removeChild(container)
  })

  it('reflects multi-selection', () => {
    const { engine, container } = makeEngine()

    const { result } = renderHook(() => useSelection(), {
      wrapper: makeWrapper(engine),
    })

    act(() => {
      engine.selectNodes(['n1', 'n2'])
    })

    expect(result.current.has('n1')).toBe(true)
    expect(result.current.has('n2')).toBe(true)

    engine.destroy()
    document.body.removeChild(container)
  })

  it('updates when a node is removed from selection via deselectNode', () => {
    const { engine, container } = makeEngine()

    const { result } = renderHook(() => useSelection(), {
      wrapper: makeWrapper(engine),
    })

    act(() => {
      engine.selectNodes(['n1', 'n2'])
    })

    act(() => {
      engine.deselectNode('n1')
    })

    expect(result.current.has('n1')).toBe(false)
    expect(result.current.has('n2')).toBe(true)

    engine.destroy()
    document.body.removeChild(container)
  })

  it('the returned set is a new instance on each change (immutable snapshot)', () => {
    const { engine, container } = makeEngine()

    const { result } = renderHook(() => useSelection(), {
      wrapper: makeWrapper(engine),
    })

    const first = result.current

    act(() => {
      engine.selectNode('n1')
    })

    const second = result.current
    expect(second).not.toBe(first)

    engine.destroy()
    document.body.removeChild(container)
  })
})
