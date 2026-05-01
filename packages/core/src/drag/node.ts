import type { Point } from '../types'
import type { DragContext, NodeDragState } from './types'

export function startNodeDrag(
  e: PointerEvent,
  nodeEl: HTMLElement,
  ctx: DragContext,
): NodeDragState | null {
  const nodeId = nodeEl.getAttribute('data-flow-node')
  if (!nodeId) return null

  const node = ctx.nodeMap.get(nodeId)
  if (!node) return null

  // Snapshot start positions of ALL nodes in the current selection so that
  // the entire group moves together (group drag). If the dragged node is not
  // in the selection we only track the single node.
  const sel = ctx.selection.getSelection()
  const selectionSnapshot = new Map<string, Point>()

  if (sel.has(nodeId)) {
    for (const id of sel) {
      const n = ctx.nodeMap.get(id)
      if (n) selectionSnapshot.set(id, { ...n.position })
    }
  } else {
    // Dragging a non-selected node — track only it
    selectionSnapshot.set(nodeId, { ...node.position })
  }

  return {
    type: 'node',
    nodeId,
    el: nodeEl,
    startPointerX: e.clientX,
    startPointerY: e.clientY,
    startNodeX: node.position.x,
    startNodeY: node.position.y,
    selectionSnapshot,
  }
}

export function processNodeMove(
  e: PointerEvent,
  state: NodeDragState,
  ctx: DragContext,
): void {
  const t = ctx.getTransform()
  const dx = (e.clientX - state.startPointerX) / t.scale
  const dy = (e.clientY - state.startPointerY) / t.scale

  // Move every node in the snapshot — handles both solo drag and group drag
  for (const [id, startPos] of state.selectionSnapshot) {
    const n = ctx.nodeMap.get(id)
    if (!n) continue
    const newX = startPos.x + dx
    const newY = startPos.y + dy
    n.position = { x: newX, y: newY }
    n.el.style.transform = `translate(${newX}px, ${newY}px)`
    ctx.recalcHandlesForNode(id)
  }
}

export function finishNodeDrag(
  state: NodeDragState,
  ctx: DragContext,
): void {
  // Build a before→after map for history recording
  const moves = new Map<string, { prev: Point; next: Point }>()

  for (const [id, prevPos] of state.selectionSnapshot) {
    const node = ctx.nodeMap.get(id)
    if (!node) continue
    const nextPos = { ...node.position }
    moves.set(id, { prev: prevPos, next: nextPos })
    ctx.emit('nodeMoved', { nodeId: id, position: nextPos })
  }

  // Record in history so the move can be undone/redone
  if (ctx.history && moves.size > 0) {
    ctx.history.record({
      undo() {
        for (const [id, { prev }] of moves) {
          const node = ctx.nodeMap.get(id)
          if (!node) continue
          node.position = { ...prev }
          node.el.style.transform = `translate(${prev.x}px, ${prev.y}px)`
          ctx.recalcHandlesForNode(id)
          ctx.emit('nodeMoved', { nodeId: id, position: { ...prev } })
        }
      },
      redo() {
        for (const [id, { next }] of moves) {
          const node = ctx.nodeMap.get(id)
          if (!node) continue
          node.position = { ...next }
          node.el.style.transform = `translate(${next.x}px, ${next.y}px)`
          ctx.recalcHandlesForNode(id)
          ctx.emit('nodeMoved', { nodeId: id, position: { ...next } })
        }
      },
    })
  }
}
