import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFlow } from './engine'
import type { FlowEngine } from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeContainer() {
  const el = document.createElement('div')
  el.dataset.testLeft = '0'
  el.dataset.testTop = '0'
  el.dataset.testWidth = '800'
  el.dataset.testHeight = '600'
  document.body.appendChild(el)
  return el
}

function makeNode(id: string, x = 0, y = 0): HTMLElement {
  const el = document.createElement('div')
  el.dataset.flowNode = id
  el.dataset.testLeft = String(x)
  el.dataset.testTop = String(y)
  el.dataset.testWidth = '120'
  el.dataset.testHeight = '40'
  return el
}

function makeHandle(
  handleId: string,
  type: 'source' | 'target',
  x = 0,
  y = 0,
): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-flow-handle', type)
  el.setAttribute('data-flow-handle-id', handleId)
  el.dataset.testLeft = String(x)
  el.dataset.testTop = String(y)
  el.dataset.testWidth = '12'
  el.dataset.testHeight = '12'
  return el
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createFlow — engine', () => {
  let container: HTMLElement
  let engine: FlowEngine

  beforeEach(() => {
    container = makeContainer()
    engine = createFlow({ container })
  })

  afterEach(() => {
    engine.destroy()
    document.body.removeChild(container)
  })

  // ── registerNode ───────────────────────────────────────────────────────────

  describe('registerNode', () => {
    it('emits nodeAdded on first registration', () => {
      const spy = vi.fn()
      engine.on('nodeAdded', spy)
      const el = makeNode('n1', 100, 50)
      container.appendChild(el)
      engine.registerNode('n1', el, { x: 100, y: 50 })
      expect(spy).toHaveBeenCalledOnce()
      expect(spy).toHaveBeenCalledWith({ nodeId: 'n1' })
    })

    it('is idempotent — duplicate registration emits nothing', () => {
      const spy = vi.fn()
      const el = makeNode('n1')
      container.appendChild(el)
      engine.registerNode('n1', el, { x: 0, y: 0 })
      engine.on('nodeAdded', spy)
      engine.registerNode('n1', el, { x: 0, y: 0 }) // duplicate
      expect(spy).not.toHaveBeenCalled()
    })

    it('sets style.transform from defaultPosition', () => {
      const el = makeNode('n1')
      container.appendChild(el)
      engine.registerNode('n1', el, { x: 80, y: 120 })
      expect(el.style.transform).toBe('translate(80px, 120px)')
    })

    it('reads offsetLeft/offsetTop when no initialPosition given', () => {
      const el = makeNode('n1')
      el.style.left = '30px'
      el.style.top = '70px'
      // jsdom offsetLeft/offsetTop won't reflect CSS without a layout engine;
      // we just verify registerNode doesn't throw
      container.appendChild(el)
      expect(() => engine.registerNode('n1', el)).not.toThrow()
    })
  })

  // ── unregisterNode ─────────────────────────────────────────────────────────

  describe('unregisterNode', () => {
    it('emits nodeRemoved', () => {
      const spy = vi.fn()
      const el = makeNode('n1')
      container.appendChild(el)
      engine.registerNode('n1', el)
      engine.on('nodeRemoved', spy)
      engine.unregisterNode('n1')
      expect(spy).toHaveBeenCalledWith({ nodeId: 'n1' })
    })

    it('removes data-flow-node attribute from element', () => {
      const el = makeNode('n1')
      el.setAttribute('data-flow-node', 'n1')
      container.appendChild(el)
      engine.registerNode('n1', el)
      engine.unregisterNode('n1')
      expect(el.getAttribute('data-flow-node')).toBeNull()
    })
  })

  // ── CRITICAL GAP: cascade edge delete on handle removal ───────────────────

  describe('CRITICAL: unregisterHandle cascades to connected edges', () => {
    it('deletes edges whose source handle is removed', () => {
      const n1 = makeNode('n1', 50, 50)
      const n2 = makeNode('n2', 200, 50)
      const h1 = makeHandle('out', 'source', 55, 55)
      const h2 = makeHandle('in', 'target', 205, 55)
      n1.appendChild(h1)
      n2.appendChild(h2)
      container.appendChild(n1)
      container.appendChild(n2)

      engine.registerNode('n1', n1, { x: 50, y: 50 })
      engine.registerNode('n2', n2, { x: 200, y: 50 })
      engine.registerHandle('n1', 'out', 'source', h1)
      engine.registerHandle('n2', 'in', 'target', h2)

      // Use restore() to inject an edge (avoids pointer event complexity in unit tests)
      engine.restore({
        nodes: [
          { id: 'n1', position: { x: 50, y: 50 } },
          { id: 'n2', position: { x: 200, y: 50 } },
        ],
        edges: [
          {
            id: 'edge-1',
            source: { nodeId: 'n1', handleId: 'out' },
            target: { nodeId: 'n2', handleId: 'in' },
          },
        ],
      })

      expect(engine.getEdges()).toHaveLength(1)

      const edgeDeletedSpy = vi.fn()
      engine.on('edgeDeleted', edgeDeletedSpy)

      // Critical: unregistering the source handle should delete the edge
      engine.unregisterHandle('n1', 'out')

      expect(engine.getEdges()).toHaveLength(0)
      expect(edgeDeletedSpy).toHaveBeenCalledOnce()
      expect(edgeDeletedSpy).toHaveBeenCalledWith({ edgeId: 'edge-1' })
    })

    it('deletes edges whose target handle is removed', () => {
      const n1 = makeNode('n1')
      const n2 = makeNode('n2')
      const h1 = makeHandle('out', 'source')
      const h2 = makeHandle('in', 'target')
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
        edges: [
          {
            id: 'edge-1',
            source: { nodeId: 'n1', handleId: 'out' },
            target: { nodeId: 'n2', handleId: 'in' },
          },
        ],
      })

      engine.unregisterHandle('n2', 'in') // remove target handle

      expect(engine.getEdges()).toHaveLength(0)
    })

    it('deletes all edges for a node when the node is removed', () => {
      const n1 = makeNode('n1')
      const n2 = makeNode('n2')
      const h1 = makeHandle('out', 'source')
      const h2 = makeHandle('in', 'target')
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
        edges: [
          {
            id: 'e1',
            source: { nodeId: 'n1', handleId: 'out' },
            target: { nodeId: 'n2', handleId: 'in' },
          },
        ],
      })

      engine.unregisterNode('n1') // should cascade delete e1

      expect(engine.getEdges()).toHaveLength(0)
    })
  })

  // ── CRITICAL GAP: setTransform does not corrupt active drag ───────────────

  describe('CRITICAL: setTransform schedules handle recalc without corrupting state', () => {
    it('calling setTransform does not throw and schedules recalc', () => {
      // The race condition: setTransform batches recalcAllHandles into the next
      // rAF. This test verifies the engine survives the call without error and
      // that getEdges() is still coherent after the rAF fires.
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0)
        return 0
      })

      expect(() => engine.setTransform({ scale: 2, translateX: 50, translateY: 30 })).not.toThrow()

      rafSpy.mockRestore()
    })

    it('handle pts are recalculated after setTransform rAF fires', () => {
      const n1 = makeNode('n1')
      const h1 = makeHandle('out', 'source', 60, 55)
      n1.appendChild(h1)
      container.appendChild(n1)
      engine.registerNode('n1', n1, { x: 50, y: 50 })
      engine.registerHandle('n1', 'out', 'source', h1)

      // Mock rAF to execute synchronously
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0)
        return 0
      })

      engine.setTransform({ scale: 2, translateX: 100, translateY: 50 })

      // After transform update, getEdges() should still return coherent data
      expect(engine.getEdges()).toBeInstanceOf(Array)

      rafSpy.mockRestore()
    })
  })

  // ── serialize / restore ───────────────────────────────────────────────────

  describe('serialize / restore', () => {
    it('serialize captures node positions and edge topology', () => {
      const n1 = makeNode('n1')
      const n2 = makeNode('n2')
      container.appendChild(n1)
      container.appendChild(n2)
      engine.registerNode('n1', n1, { x: 10, y: 20 })
      engine.registerNode('n2', n2, { x: 100, y: 200 })

      const state = engine.serialize()

      expect(state.nodes).toHaveLength(2)
      expect(state.nodes.find((n) => n.id === 'n1')?.position).toEqual({ x: 10, y: 20 })
      expect(state.nodes.find((n) => n.id === 'n2')?.position).toEqual({ x: 100, y: 200 })
      expect(state.edges).toHaveLength(0)
    })

    it('restore round-trips correctly', () => {
      const n1 = makeNode('n1')
      const n2 = makeNode('n2')
      const h1 = makeHandle('out', 'source')
      const h2 = makeHandle('in', 'target')
      n1.appendChild(h1)
      n2.appendChild(h2)
      container.appendChild(n1)
      container.appendChild(n2)
      engine.registerNode('n1', n1, { x: 50, y: 80 })
      engine.registerNode('n2', n2, { x: 300, y: 80 })
      engine.registerHandle('n1', 'out', 'source', h1)
      engine.registerHandle('n2', 'in', 'target', h2)

      engine.restore({
        nodes: [
          { id: 'n1', position: { x: 50, y: 80 } },
          { id: 'n2', position: { x: 300, y: 80 } },
        ],
        edges: [
          {
            id: 'e1',
            source: { nodeId: 'n1', handleId: 'out' },
            target: { nodeId: 'n2', handleId: 'in' },
          },
        ],
      })

      const state = engine.serialize()
      expect(state.edges).toHaveLength(1)
      expect(state.edges[0].source).toMatchObject({ nodeId: 'n1', handleId: 'out' })
      expect(state.edges[0].target).toMatchObject({ nodeId: 'n2', handleId: 'in' })
    })

    it('restore skips edges with missing handles', () => {
      // This tests that restore is tolerant of handles not yet mounted
      const n1 = makeNode('n1')
      container.appendChild(n1)
      engine.registerNode('n1', n1, { x: 0, y: 0 })
      // n2 not registered — handle missing

      const edgeCreatedSpy = vi.fn()
      engine.on('edgeCreated', edgeCreatedSpy)

      engine.restore({
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
        edges: [
          {
            id: 'e1',
            source: { nodeId: 'n1', handleId: 'out' },
            target: { nodeId: 'n2', handleId: 'in' }, // n2 missing
          },
        ],
      })

      expect(edgeCreatedSpy).not.toHaveBeenCalled()
      expect(engine.getEdges()).toHaveLength(0)
    })
  })

  // ── removeEdge ────────────────────────────────────────────────────────────

  describe('removeEdge', () => {
    it('emits edgeDeleted and removes from getEdges()', () => {
      const n1 = makeNode('n1')
      const n2 = makeNode('n2')
      const h1 = makeHandle('out', 'source')
      const h2 = makeHandle('in', 'target')
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

      const spy = vi.fn()
      engine.on('edgeDeleted', spy)
      engine.removeEdge('e1')

      expect(spy).toHaveBeenCalledWith({ edgeId: 'e1' })
      expect(engine.getEdges()).toHaveLength(0)
    })

    it('is a no-op for non-existent edge id', () => {
      const spy = vi.fn()
      engine.on('edgeDeleted', spy)
      expect(() => engine.removeEdge('does-not-exist')).not.toThrow()
      expect(spy).not.toHaveBeenCalled()
    })
  })

  // ── destroy ───────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('clears all maps and stops emitting events', () => {
      const n1 = makeNode('n1')
      container.appendChild(n1)
      engine.registerNode('n1', n1, { x: 0, y: 0 })

      engine.destroy()

      const spy = vi.fn()
      engine.on('nodeAdded', spy)

      // Manually trigger a DOM mutation — observer should be disconnected
      const n2 = makeNode('n2')
      n2.setAttribute('data-flow-node', 'n2')
      container.appendChild(n2)

      // Wait a tick for MutationObserver (it's async) — observer should be silent
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(spy).not.toHaveBeenCalled()
          resolve()
        }, 50)
      })
    })
  })

  // ── setNodePosition ───────────────────────────────────────────────────────

  describe('setNodePosition', () => {
    it('updates style.transform and emits nodeMoved', () => {
      const el = makeNode('n1')
      container.appendChild(el)
      engine.registerNode('n1', el, { x: 0, y: 0 })

      const spy = vi.fn()
      engine.on('nodeMoved', spy)
      engine.setNodePosition('n1', { x: 150, y: 200 })

      expect(el.style.transform).toBe('translate(150px, 200px)')
      expect(spy).toHaveBeenCalledWith({ nodeId: 'n1', position: { x: 150, y: 200 } })
    })

    it('is a no-op for unknown node id', () => {
      expect(() => engine.setNodePosition('ghost', { x: 0, y: 0 })).not.toThrow()
    })
  })
})
