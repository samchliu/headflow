import { describe, expect, it, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { createFlow } from '@headflow/core'
import type { FlowEngine } from '@headflow/core'
import { FlowContext } from './context'
import { useEdges } from './useEdges'

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

afterEach(() => {
  cleanup()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useEdges', () => {
  it('returns empty array initially', () => {
    const container = makeContainer()
    const engine = createFlow({ container })

    const { result } = renderHook(() => useEdges(), {
      wrapper: makeWrapper(engine),
    })

    expect(result.current).toEqual([])
    engine.destroy()
    document.body.removeChild(container)
  })

  it('updates when an edge is created via restore()', async () => {
    const container = makeContainer()
    const engine = createFlow({ container })

    // Register nodes + handles so restore() can find them
    const n1 = document.createElement('div')
    const n2 = document.createElement('div')
    const h1 = document.createElement('div')
    const h2 = document.createElement('div')
    n1.appendChild(h1)
    n2.appendChild(h2)
    container.appendChild(n1)
    container.appendChild(n2)
    engine.registerNode('n1', n1, { x: 0, y: 0 })
    engine.registerNode('n2', n2, { x: 100, y: 0 })
    engine.registerHandle('n1', 'out', 'source', h1)
    engine.registerHandle('n2', 'in', 'target', h2)

    const { result } = renderHook(() => useEdges(), {
      wrapper: makeWrapper(engine),
    })

    expect(result.current).toHaveLength(0)

    act(() => {
      engine.restore({
        nodes: [
          { id: 'n1', position: { x: 0, y: 0 } },
          { id: 'n2', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'e1', source: { nodeId: 'n1', handleId: 'out' }, target: { nodeId: 'n2', handleId: 'in' } }],
      })
    })

    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe('e1')

    engine.destroy()
    document.body.removeChild(container)
  })

  it('updates when an edge is removed via removeEdge()', async () => {
    const container = makeContainer()
    const engine = createFlow({ container })

    const n1 = document.createElement('div')
    const n2 = document.createElement('div')
    const h1 = document.createElement('div')
    const h2 = document.createElement('div')
    n1.appendChild(h1)
    n2.appendChild(h2)
    container.appendChild(n1)
    container.appendChild(n2)
    engine.registerNode('n1', n1, { x: 0, y: 0 })
    engine.registerNode('n2', n2, { x: 100, y: 0 })
    engine.registerHandle('n1', 'out', 'source', h1)
    engine.registerHandle('n2', 'in', 'target', h2)

    engine.restore({
      nodes: [
        { id: 'n1', position: { x: 0, y: 0 } },
        { id: 'n2', position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: { nodeId: 'n1', handleId: 'out' }, target: { nodeId: 'n2', handleId: 'in' } }],
    })

    const { result } = renderHook(() => useEdges(), {
      wrapper: makeWrapper(engine),
    })

    expect(result.current).toHaveLength(1)

    act(() => {
      engine.removeEdge('e1')
    })

    expect(result.current).toHaveLength(0)

    engine.destroy()
    document.body.removeChild(container)
  })

  it('does NOT re-render when a node moves (only edge topology changes trigger)', () => {
    const container = makeContainer()
    const engine = createFlow({ container })
    const n1 = document.createElement('div')
    container.appendChild(n1)
    engine.registerNode('n1', n1, { x: 0, y: 0 })

    let renderCount = 0
    const { result } = renderHook(
      () => {
        renderCount++
        return useEdges()
      },
      { wrapper: makeWrapper(engine) },
    )

    const baseRenderCount = renderCount

    act(() => {
      engine.setNodePosition('n1', { x: 200, y: 300 })
    })

    // Should not have caused additional renders
    expect(renderCount).toBe(baseRenderCount)

    engine.destroy()
    document.body.removeChild(container)
  })
})
