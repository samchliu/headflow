import type { DragContext, LassoDragState } from './types'
import type { NodeEntry, Point, Rect } from '../types'
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

  const hitNodeIds = hitTestNodes(ctx.nodeMap, canvasRect)

  if (state.appendMode) {
    ctx.selection.selectNodes(hitNodeIds)
  } else {
    ctx.selection.clearSelection()
    ctx.selection.selectNodes(hitNodeIds)
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
