import { describe, expect, it, vi } from 'vitest'
import mitt from 'mitt'
import { createSelectionManager } from './selection'
import type { Edge, FlowEvents, NodeEntry } from './types'

function makeNodeMap(ids: string[]): Map<string, NodeEntry> {
  const m = new Map<string, NodeEntry>()
  for (const id of ids) {
    m.set(id, { el: document.createElement('div'), position: { x: 0, y: 0 } })
  }
  return m
}

function makeEdgeMap(ids: string[]): Map<string, Edge> {
  const m = new Map<string, Edge>()
  for (const id of ids) {
    m.set(id, {
      id,
      source: { nodeId: 'n1', handleId: 'h1', pt: { x: 0, y: 0 } },
      target: { nodeId: 'n2', handleId: 'h2', pt: { x: 0, y: 0 } },
    })
  }
  return m
}

describe('createSelectionManager', () => {
  it('select adds a node to the set and emits selectionChanged', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    emitter.on('selectionChanged', spy)

    const nodes = makeNodeMap(['n1', 'n2'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    sel.select('n1')

    expect(sel.has('n1')).toBe(true)
    expect(sel.size()).toBe(1)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith({ selected: new Set(['n1']) })
  })

  it('select is a no-op for unknown id', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    emitter.on('selectionChanged', spy)

    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    sel.select('ghost')

    expect(spy).not.toHaveBeenCalled()
    expect(sel.size()).toBe(0)
  })

  it('select is idempotent — no extra emit if already selected', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    sel.select('n1')
    emitter.on('selectionChanged', spy)
    sel.select('n1') // duplicate

    expect(spy).not.toHaveBeenCalled()
  })

  it('select accepts edge ids too (unified selection)', () => {
    const emitter = mitt<FlowEvents>()
    const nodes = makeNodeMap(['n1', 'n2'])
    const edges = makeEdgeMap(['e1'])
    const sel = createSelectionManager(nodes, edges, emitter)

    sel.select('n1')
    sel.select('e1')

    expect(sel.has('n1')).toBe(true)
    expect(sel.has('e1')).toBe(true)
    expect(sel.size()).toBe(2)
  })

  it('selectMany adds multiple node/edge ids in one emit', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    emitter.on('selectionChanged', spy)

    const nodes = makeNodeMap(['n1', 'n2', 'n3'])
    const edges = makeEdgeMap(['e1'])
    const sel = createSelectionManager(nodes, edges, emitter)

    sel.selectMany(['n1', 'n2', 'e1'])

    expect(sel.has('n1')).toBe(true)
    expect(sel.has('n2')).toBe(true)
    expect(sel.has('e1')).toBe(true)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('selectMany only emits if anything actually changed', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)
    sel.select('n1')

    emitter.on('selectionChanged', spy)
    sel.selectMany(['n1']) // already selected

    expect(spy).not.toHaveBeenCalled()
  })

  it('toggle selects an unselected id and deselects a selected one', () => {
    const emitter = mitt<FlowEvents>()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    sel.toggle('n1')
    expect(sel.has('n1')).toBe(true)

    sel.toggle('n1')
    expect(sel.has('n1')).toBe(false)
  })

  it('deselect removes a node and emits', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    sel.select('n1')
    emitter.on('selectionChanged', spy)
    sel.deselect('n1')

    expect(sel.has('n1')).toBe(false)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('deselect is a no-op for nodes not in selection', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    emitter.on('selectionChanged', spy)
    sel.deselect('n1') // not selected

    expect(spy).not.toHaveBeenCalled()
  })

  it('clearSelection clears all and emits once', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1', 'n2', 'n3'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    sel.selectMany(['n1', 'n2', 'n3'])
    emitter.on('selectionChanged', spy)
    sel.clearSelection()

    expect(sel.size()).toBe(0)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('clearSelection is a no-op when already empty', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    emitter.on('selectionChanged', spy)
    sel.clearSelection()

    expect(spy).not.toHaveBeenCalled()
  })

  it('getSelection returns an independent copy', () => {
    const emitter = mitt<FlowEvents>()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)
    sel.select('n1')

    const copy = sel.getSelection()
    copy.delete('n1')

    expect(sel.has('n1')).toBe(true) // original unaffected
  })

  it('onNodeRemoved removes the node from selection and emits', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1', 'n2'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    sel.selectMany(['n1', 'n2'])
    emitter.on('selectionChanged', spy)
    sel.onNodeRemoved('n1')

    expect(sel.has('n1')).toBe(false)
    expect(sel.has('n2')).toBe(true)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('onNodeRemoved is a no-op for unselected node', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, makeEdgeMap([]), emitter)

    emitter.on('selectionChanged', spy)
    sel.onNodeRemoved('n1') // not selected

    expect(spy).not.toHaveBeenCalled()
  })

  it('onEdgeRemoved removes the edge from selection and emits', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const edges = makeEdgeMap(['e1', 'e2'])
    const sel = createSelectionManager(nodes, edges, emitter)

    sel.selectMany(['e1', 'e2'])
    emitter.on('selectionChanged', spy)
    sel.onEdgeRemoved('e1')

    expect(sel.has('e1')).toBe(false)
    expect(sel.has('e2')).toBe(true)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('onEdgeRemoved is a no-op for unselected edge', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const edges = makeEdgeMap(['e1'])
    const sel = createSelectionManager(makeNodeMap([]), edges, emitter)

    emitter.on('selectionChanged', spy)
    sel.onEdgeRemoved('e1') // not selected

    expect(spy).not.toHaveBeenCalled()
  })

  it('moveSelectionBy updates positions and calls recalcHandlesForNode, ignoring edge ids', () => {
    const emitter = mitt<FlowEvents>()
    const nodes = makeNodeMap(['n1', 'n2'])
    const edges = makeEdgeMap(['e1'])
    const sel = createSelectionManager(nodes, edges, emitter)

    // Set initial positions
    nodes.get('n1')!.position = { x: 10, y: 20 }
    nodes.get('n2')!.position = { x: 100, y: 200 }

    sel.selectMany(['n1', 'n2', 'e1'])

    const recalcSpy = vi.fn()
    sel.moveSelectionBy({ x: 5, y: 10 }, recalcSpy)

    expect(nodes.get('n1')!.position).toEqual({ x: 15, y: 30 })
    expect(nodes.get('n2')!.position).toEqual({ x: 105, y: 210 })
    expect(recalcSpy).toHaveBeenCalledWith('n1')
    expect(recalcSpy).toHaveBeenCalledWith('n2')
    expect(recalcSpy).not.toHaveBeenCalledWith('e1')
  })
})
