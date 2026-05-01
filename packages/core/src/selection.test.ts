import { describe, expect, it, vi } from 'vitest'
import mitt from 'mitt'
import { createSelectionManager } from './selection'
import type { FlowEvents, NodeEntry } from './types'

function makeNodeMap(ids: string[]): Map<string, NodeEntry> {
  const m = new Map<string, NodeEntry>()
  for (const id of ids) {
    m.set(id, { el: document.createElement('div'), position: { x: 0, y: 0 } })
  }
  return m
}

describe('createSelectionManager', () => {
  it('select adds a node to the set and emits selectionChanged', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    emitter.on('selectionChanged', spy)

    const nodes = makeNodeMap(['n1', 'n2'])
    const sel = createSelectionManager(nodes, emitter)

    sel.select('n1')

    expect(sel.has('n1')).toBe(true)
    expect(sel.size()).toBe(1)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith({ selected: new Set(['n1']) })
  })

  it('select is a no-op for unknown nodeId', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    emitter.on('selectionChanged', spy)

    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, emitter)

    sel.select('ghost')

    expect(spy).not.toHaveBeenCalled()
    expect(sel.size()).toBe(0)
  })

  it('select is idempotent — no extra emit if already selected', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, emitter)

    sel.select('n1')
    emitter.on('selectionChanged', spy)
    sel.select('n1') // duplicate

    expect(spy).not.toHaveBeenCalled()
  })

  it('selectNodes adds multiple nodes in one emit', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    emitter.on('selectionChanged', spy)

    const nodes = makeNodeMap(['n1', 'n2', 'n3'])
    const sel = createSelectionManager(nodes, emitter)

    sel.selectNodes(['n1', 'n2'])

    expect(sel.has('n1')).toBe(true)
    expect(sel.has('n2')).toBe(true)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('selectNodes only emits if anything actually changed', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, emitter)
    sel.select('n1')

    emitter.on('selectionChanged', spy)
    sel.selectNodes(['n1']) // already selected

    expect(spy).not.toHaveBeenCalled()
  })

  it('deselect removes a node and emits', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, emitter)

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
    const sel = createSelectionManager(nodes, emitter)

    emitter.on('selectionChanged', spy)
    sel.deselect('n1') // not selected

    expect(spy).not.toHaveBeenCalled()
  })

  it('clearSelection clears all and emits once', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1', 'n2', 'n3'])
    const sel = createSelectionManager(nodes, emitter)

    sel.selectNodes(['n1', 'n2', 'n3'])
    emitter.on('selectionChanged', spy)
    sel.clearSelection()

    expect(sel.size()).toBe(0)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('clearSelection is a no-op when already empty', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, emitter)

    emitter.on('selectionChanged', spy)
    sel.clearSelection()

    expect(spy).not.toHaveBeenCalled()
  })

  it('getSelection returns an independent copy', () => {
    const emitter = mitt<FlowEvents>()
    const nodes = makeNodeMap(['n1'])
    const sel = createSelectionManager(nodes, emitter)
    sel.select('n1')

    const copy = sel.getSelection()
    copy.delete('n1')

    expect(sel.has('n1')).toBe(true) // original unaffected
  })

  it('onNodeRemoved removes the node from selection and emits', () => {
    const emitter = mitt<FlowEvents>()
    const spy = vi.fn()
    const nodes = makeNodeMap(['n1', 'n2'])
    const sel = createSelectionManager(nodes, emitter)

    sel.selectNodes(['n1', 'n2'])
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
    const sel = createSelectionManager(nodes, emitter)

    emitter.on('selectionChanged', spy)
    sel.onNodeRemoved('n1') // not selected

    expect(spy).not.toHaveBeenCalled()
  })

  it('moveSelectionBy updates positions and calls recalcHandlesForNode', () => {
    const emitter = mitt<FlowEvents>()
    const nodes = makeNodeMap(['n1', 'n2'])
    const sel = createSelectionManager(nodes, emitter)

    // Set initial positions
    nodes.get('n1')!.position = { x: 10, y: 20 }
    nodes.get('n2')!.position = { x: 100, y: 200 }

    sel.selectNodes(['n1', 'n2'])

    const recalcSpy = vi.fn()
    sel.moveSelectionBy({ x: 5, y: 10 }, recalcSpy)

    expect(nodes.get('n1')!.position).toEqual({ x: 15, y: 30 })
    expect(nodes.get('n2')!.position).toEqual({ x: 105, y: 210 })
    expect(recalcSpy).toHaveBeenCalledWith('n1')
    expect(recalcSpy).toHaveBeenCalledWith('n2')
  })
})
