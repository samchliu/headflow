import { describe, expect, it } from 'vitest'
import { hitTestEdges, hitTestNodes } from './lasso'
import type { Edge, NodeEntry, Point } from '../types'

function makeNodeMap(entries: Array<[string, number, number]>): Map<string, NodeEntry> {
  const m = new Map<string, NodeEntry>()
  for (const [id, x, y] of entries) {
    m.set(id, {
      el: document.createElement('div'),
      position: { x, y },
    })
  }
  return m
}

describe('hitTestNodes', () => {
  it('returns nodes whose position falls inside the rect', () => {
    const nodes = makeNodeMap([
      ['n1', 50, 50],
      ['n2', 150, 150],
      ['n3', 250, 250],
    ])
    const result = hitTestNodes(nodes, { x: 0, y: 0, w: 200, h: 200 })
    expect(result).toContain('n1')
    expect(result).toContain('n2')
    expect(result).not.toContain('n3')
  })

  it('returns empty array when nothing is inside', () => {
    const nodes = makeNodeMap([['n1', 500, 500]])
    const result = hitTestNodes(nodes, { x: 0, y: 0, w: 100, h: 100 })
    expect(result).toHaveLength(0)
  })

  it('handles negative width/height (drag up-left)', () => {
    // Lasso dragged from (200, 200) up-left to (50, 50): w=-150, h=-150
    const nodes = makeNodeMap([
      ['n1', 100, 100], // should be inside
      ['n2', 300, 300], // outside
    ])
    const result = hitTestNodes(nodes, { x: 200, y: 200, w: -150, h: -150 })
    expect(result).toContain('n1')
    expect(result).not.toContain('n2')
  })

  it('includes nodes exactly on the boundary', () => {
    const nodes = makeNodeMap([
      ['on-edge', 0, 0],
      ['at-end', 100, 100],
    ])
    const result = hitTestNodes(nodes, { x: 0, y: 0, w: 100, h: 100 })
    expect(result).toContain('on-edge')
    expect(result).toContain('at-end')
  })

  it('returns all nodes inside a large rect', () => {
    const nodes = makeNodeMap([
      ['a', 10, 10],
      ['b', 50, 50],
      ['c', 99, 99],
    ])
    const result = hitTestNodes(nodes, { x: 0, y: 0, w: 100, h: 100 })
    expect(result).toHaveLength(3)
  })

  it('returns empty for empty nodeMap', () => {
    const nodes = new Map<string, NodeEntry>()
    const result = hitTestNodes(nodes, { x: 0, y: 0, w: 500, h: 500 })
    expect(result).toHaveLength(0)
  })
})

function makeEdgeMap(entries: Array<[string, Point, Point]>): Map<string, Edge> {
  const m = new Map<string, Edge>()
  for (const [id, sourcePt, targetPt] of entries) {
    m.set(id, {
      id,
      source: { nodeId: 'a', handleId: 'h', pt: sourcePt },
      target: { nodeId: 'b', handleId: 'h', pt: targetPt },
    })
  }
  return m
}

describe('hitTestEdges', () => {
  it('hits an edge fully inside the rect', () => {
    const edges = makeEdgeMap([['e1', { x: 20, y: 20 }, { x: 80, y: 80 }]])
    const result = hitTestEdges(edges, { x: 0, y: 0, w: 100, h: 100 })
    expect(result).toContain('e1')
  })

  it('hits an edge with only one endpoint inside the rect', () => {
    const edges = makeEdgeMap([['e1', { x: 50, y: 50 }, { x: 500, y: 500 }]])
    const result = hitTestEdges(edges, { x: 0, y: 0, w: 100, h: 100 })
    expect(result).toContain('e1')
  })

  it('hits an edge that crosses the rect boundary with both endpoints outside', () => {
    const edges = makeEdgeMap([['e1', { x: -50, y: 50 }, { x: 150, y: 50 }]])
    const result = hitTestEdges(edges, { x: 0, y: 0, w: 100, h: 100 })
    expect(result).toContain('e1')
  })

  it('does not hit an edge fully outside the rect', () => {
    const edges = makeEdgeMap([['e1', { x: 200, y: 200 }, { x: 300, y: 300 }]])
    const result = hitTestEdges(edges, { x: 0, y: 0, w: 100, h: 100 })
    expect(result).not.toContain('e1')
  })

  it('handles negative width/height (drag up-left)', () => {
    const edges = makeEdgeMap([['e1', { x: 20, y: 20 }, { x: 80, y: 80 }]])
    const result = hitTestEdges(edges, { x: 200, y: 200, w: -150, h: -150 })
    expect(result).toContain('e1')
  })

  it('returns empty for empty edgeMap', () => {
    const edges = new Map<string, Edge>()
    const result = hitTestEdges(edges, { x: 0, y: 0, w: 500, h: 500 })
    expect(result).toHaveLength(0)
  })
})
