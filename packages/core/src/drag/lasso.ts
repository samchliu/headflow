import type { DragContext, LassoDragState } from './types'
import type { Edge, NodeEntry, Point, Rect } from '../types'
import { toCanvasSpace } from '../transform'

export function startLassoDrag(e: PointerEvent, container: HTMLElement): LassoDragState {
  const cr = container.getBoundingClientRect()
  return {
    type: 'lasso',
    startX: e.clientX - cr.left,
    startY: e.clientY - cr.top,
    appendMode: e.shiftKey,
  }
}

export function processLassoMove(
  e: PointerEvent,
  state: LassoDragState,
  ctx: DragContext,
): void {
  const cr = ctx.container.getBoundingClientRect()
  const currentX = e.clientX - cr.left
  const currentY = e.clientY - cr.top

  const rect: Rect = {
    x: state.startX,
    y: state.startY,
    w: currentX - state.startX,
    h: currentY - state.startY,
  }

  ctx.emit('lassoUpdate', { rect })
}

export function finishLassoDrag(
  e: PointerEvent,
  state: LassoDragState,
  ctx: DragContext,
): void {
  const cr = ctx.container.getBoundingClientRect()
  const currentX = e.clientX - cr.left
  const currentY = e.clientY - cr.top

  // Convert lasso rect to canvas space for accurate hit testing
  const t = ctx.getTransform()
  const topLeft = toCanvasSpace({ x: Math.min(state.startX, currentX), y: Math.min(state.startY, currentY) }, t)
  const bottomRight = toCanvasSpace({ x: Math.max(state.startX, currentX), y: Math.max(state.startY, currentY) }, t)

  const canvasRect: Rect = {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
    h: bottomRight.y - topLeft.y,
  }

  const hitIds = [
    ...hitTestNodes(ctx.nodeMap, canvasRect),
    ...hitTestEdges(ctx.edgeMap, canvasRect),
  ]

  if (state.appendMode) {
    ctx.selection.selectMany(hitIds)
  } else {
    ctx.selection.clearSelection()
    ctx.selection.selectMany(hitIds)
  }

  ctx.emit('lassoEnd', undefined)
}

/**
 * Return nodeIds whose canvas-space position falls within the given rect.
 * Handles negative dimensions (drag up-left) by using normalised bounds.
 *
 * NOTE: uses node.position (top-left corner). For larger nodes, a
 * getBoundingClientRect approach would be more accurate, but for Phase 2
 * O(n) point-in-rect is sufficient. TODO: replace with quadtree for >2000 nodes.
 */
export function hitTestNodes(nodeMap: Map<string, NodeEntry>, rect: Rect): string[] {
  const x1 = rect.w < 0 ? rect.x + rect.w : rect.x
  const y1 = rect.h < 0 ? rect.y + rect.h : rect.y
  const x2 = rect.w < 0 ? rect.x : rect.x + rect.w
  const y2 = rect.h < 0 ? rect.y : rect.y + rect.h

  const result: string[] = []
  for (const [nodeId, node] of nodeMap) {
    const { x, y } = node.position
    if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
      result.push(nodeId)
    }
  }
  return result
}

/**
 * Return edgeIds whose source→target straight line intersects the given rect.
 * Deliberately ignores bezier curvature (treats the edge as a straight
 * segment) to match `hitTestNodes`'s cheap O(n) philosophy — a curve-accurate
 * test can be a future refinement if needed.
 */
export function hitTestEdges(edgeMap: Map<string, Edge>, rect: Rect): string[] {
  const x1 = rect.w < 0 ? rect.x + rect.w : rect.x
  const y1 = rect.h < 0 ? rect.y + rect.h : rect.y
  const x2 = rect.w < 0 ? rect.x : rect.x + rect.w
  const y2 = rect.h < 0 ? rect.y : rect.y + rect.h

  function pointInRect(p: Point): boolean {
    return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2
  }

  const corners: [Point, Point][] = [
    [{ x: x1, y: y1 }, { x: x2, y: y1 }],
    [{ x: x2, y: y1 }, { x: x2, y: y2 }],
    [{ x: x2, y: y2 }, { x: x1, y: y2 }],
    [{ x: x1, y: y2 }, { x: x1, y: y1 }],
  ]

  const result: string[] = []
  for (const [edgeId, edge] of edgeMap) {
    const a = edge.source.pt
    const b = edge.target.pt
    if (pointInRect(a) || pointInRect(b)) {
      result.push(edgeId)
      continue
    }
    for (const [c, d] of corners) {
      if (segmentsIntersect(a, b, c, d)) {
        result.push(edgeId)
        break
      }
    }
  }
  return result
}

/** Standard orientation-based segment-segment intersection test. */
function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  function orientation(a: Point, b: Point, c: Point): number {
    const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
    if (val === 0) return 0
    return val > 0 ? 1 : 2
  }

  function onSegment(a: Point, b: Point, c: Point): boolean {
    return (
      b.x <= Math.max(a.x, c.x) && b.x >= Math.min(a.x, c.x) &&
      b.y <= Math.max(a.y, c.y) && b.y >= Math.min(a.y, c.y)
    )
  }

  const o1 = orientation(p1, p2, p3)
  const o2 = orientation(p1, p2, p4)
  const o3 = orientation(p3, p4, p1)
  const o4 = orientation(p3, p4, p2)

  if (o1 !== o2 && o3 !== o4) return true

  if (o1 === 0 && onSegment(p1, p3, p2)) return true
  if (o2 === 0 && onSegment(p1, p4, p2)) return true
  if (o3 === 0 && onSegment(p3, p1, p4)) return true
  if (o4 === 0 && onSegment(p3, p2, p4)) return true

  return false
}
