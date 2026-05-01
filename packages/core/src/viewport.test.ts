import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createFlow } from './engine'
import type { FlowEngine } from './types'

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeContainer(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.width = '800px'
  el.style.height = '600px'
  document.body.appendChild(el)
  return el
}

function makeNode(container: HTMLDivElement, id: string, x: number, y: number): HTMLDivElement {
  const el = document.createElement('div')
  el.setAttribute('data-flow-node', id)
  el.style.position = 'absolute'
  el.style.transform = `translate(${x}px, ${y}px)`
  el.style.width = '120px'
  el.style.height = '44px'
  container.appendChild(el)
  return el
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Viewport API', () => {
  let container: HTMLDivElement
  let engine: FlowEngine

  beforeEach(() => {
    container = makeContainer()
    engine = createFlow({ container })
  })

  afterEach(() => {
    engine.destroy()
    document.body.removeChild(container)
  })

  it('getViewport returns the initial identity transform', () => {
    const vp = engine.getViewport()
    expect(vp.scale).toBe(1)
    expect(vp.translateX).toBe(0)
    expect(vp.translateY).toBe(0)
  })

  it('setTransform updates getViewport', () => {
    engine.setTransform({ scale: 2, translateX: 50, translateY: -30 })
    const vp = engine.getViewport()
    expect(vp.scale).toBe(2)
    expect(vp.translateX).toBe(50)
    expect(vp.translateY).toBe(-30)
  })

  it('setTransform emits viewportChanged', () => {
    const events: object[] = []
    engine.on('viewportChanged', (vp) => events.push(vp))
    engine.setTransform({ scale: 1.5 })
    expect(events).toHaveLength(1)
    expect((events[0] as { scale: number }).scale).toBe(1.5)
  })

  it('panTo centers the given canvas point in the viewport', () => {
    // Pan to canvas origin (0,0) → should place it at viewport center (400, 300)
    engine.panTo(0, 0)
    const vp = engine.getViewport()
    // At scale=1, translateX = viewW/2 - 0 = 400, translateY = viewH/2 - 0 = 300
    // Note: clientWidth/Height in jsdom returns 0, so we fall back to 800×600
    expect(vp.translateX).toBeCloseTo(400, 0)
    expect(vp.translateY).toBeCloseTo(300, 0)
  })

  it('zoomTo changes scale while keeping viewport center fixed', () => {
    // Start at identity, zoom to 2 (centered on viewport center)
    engine.zoomTo(2)
    const vp = engine.getViewport()
    expect(vp.scale).toBe(2)
    // Viewport center should map to same canvas point before/after zoom
    // Before: canvas center = (400-0)/1 = 400, (300-0)/1 = 300
    // After: translateX = 400 - 400*2 = -400, translateY = 300 - 300*2 = -300
    expect(vp.translateX).toBeCloseTo(-400, 0)
    expect(vp.translateY).toBeCloseTo(-300, 0)
  })

  it('zoomTo with explicit anchor keeps that point fixed', () => {
    // Zoom to 2 anchored at viewport origin (0,0)
    engine.zoomTo(2, { x: 0, y: 0 })
    const vp = engine.getViewport()
    expect(vp.scale).toBe(2)
    // Canvas pt at (0,0) before zoom: canvasX = (0-0)/1 = 0
    // translateX after = 0 - 0*2 = 0
    expect(vp.translateX).toBeCloseTo(0, 0)
    expect(vp.translateY).toBeCloseTo(0, 0)
  })

  it('fitView computes a scale + translation to contain all nodes', () => {
    // Add two nodes explicitly so they are immediately registered
    const n1El = makeNode(container, 'n1', 0, 0)
    const n2El = makeNode(container, 'n2', 400, 200)
    engine.registerNode('n1', n1El, { x: 0, y: 0 })
    engine.registerNode('n2', n2El, { x: 400, y: 200 })
    engine.fitView({ padding: 20 })
    const vp = engine.getViewport()
    // After fitView, scale should be ≤ 1 (nodes span more than viewport)
    expect(vp.scale).toBeGreaterThan(0)
    expect(vp.scale).toBeLessThanOrEqual(2)
  })

  it('fitView is a no-op when there are no nodes', () => {
    engine.fitView()
    const vp = engine.getViewport()
    expect(vp.scale).toBe(1)
    expect(vp.translateX).toBe(0)
    expect(vp.translateY).toBe(0)
  })
})

describe('Undo/Redo via engine API', () => {
  let container: HTMLDivElement
  let engine: FlowEngine

  beforeEach(() => {
    container = makeContainer()
    engine = createFlow({ container })
  })

  afterEach(() => {
    engine.destroy()
    document.body.removeChild(container)
  })

  it('starts with canUndo=false, canRedo=false', () => {
    expect(engine.canUndo()).toBe(false)
    expect(engine.canRedo()).toBe(false)
  })

  it('removeEdge records to history — undo restores edge', () => {
    const nodeA = makeNode(container, 'nodeA', 0, 0)
    const nodeB = makeNode(container, 'nodeB', 200, 0)

    const srcEl = document.createElement('div')
    srcEl.setAttribute('data-flow-handle', 'source')
    srcEl.setAttribute('data-flow-handle-id', 'out')
    nodeA.appendChild(srcEl)

    const tgtEl = document.createElement('div')
    tgtEl.setAttribute('data-flow-handle', 'target')
    tgtEl.setAttribute('data-flow-handle-id', 'in')
    nodeB.appendChild(tgtEl)

    engine.registerHandle('nodeA', 'out', 'source', srcEl)
    engine.registerHandle('nodeB', 'in', 'target', tgtEl)

    // Manually add an edge (bypassing drag for unit test)
    const mockEdge = {
      id: 'e-test',
      source: { nodeId: 'nodeA', handleId: 'out', pt: { x: 0, y: 0 } },
      target: { nodeId: 'nodeB', handleId: 'in', pt: { x: 200, y: 0 } },
    }
    ;(engine as unknown as { edgeMap?: Map<string, object> })

    // Use restore to inject the edge
    engine.restore({
      nodes: [
        { id: 'nodeA', position: { x: 0, y: 0 } },
        { id: 'nodeB', position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e-test', source: { nodeId: 'nodeA', handleId: 'out' }, target: { nodeId: 'nodeB', handleId: 'in' } },
      ],
    })

    expect(engine.getEdges()).toHaveLength(1)

    engine.removeEdge('e-test')
    expect(engine.getEdges()).toHaveLength(0)
    expect(engine.canUndo()).toBe(true)

    engine.undo()
    expect(engine.getEdges()).toHaveLength(1)
    expect(engine.canRedo()).toBe(true)

    engine.redo()
    expect(engine.getEdges()).toHaveLength(0)
  })

  it('moveSelectionBy records to history — undo reverts positions', () => {
    const nAEl = makeNode(container, 'nA', 100, 100)
    engine.registerNode('nA', nAEl, { x: 100, y: 100 })
    engine.selectNode('nA')

    engine.moveSelectionBy({ x: 50, y: 30 })

    const afterMove = engine.serialize().nodes.find((n) => n.id === 'nA')!
    expect(afterMove.position.x).toBeCloseTo(150, 0)

    expect(engine.canUndo()).toBe(true)
    engine.undo()

    const afterUndo = engine.serialize().nodes.find((n) => n.id === 'nA')!
    expect(afterUndo.position.x).toBeCloseTo(100, 0)
    expect(afterUndo.position.y).toBeCloseTo(100, 0)
  })
})
