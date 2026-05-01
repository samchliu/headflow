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

  return {
    type: 'node',
    nodeId,
    el: nodeEl,
    startPointerX: e.clientX,
    startPointerY: e.clientY,
    startNodeX: node.position.x,
    startNodeY: node.position.y,
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
  const newX = state.startNodeX + dx
  const newY = state.startNodeY + dy

  const node = ctx.nodeMap.get(state.nodeId)
  if (!node) return

  node.position = { x: newX, y: newY }
  node.el.style.transform = `translate(${newX}px, ${newY}px)`
  ctx.recalcHandlesForNode(state.nodeId)

  // Also move other selected nodes by the same delta (group drag)
  const selected = ctx.selection.getSelection()
  if (selected.has(state.nodeId) && selected.size > 1) {
    for (const otherId of selected) {
      if (otherId === state.nodeId) continue
      const other = ctx.nodeMap.get(otherId)
      if (!other) continue
      // We need the original positions of group members — store them in state
      // For Phase 2 this is simplified: group drag is handled via moveSelection
    }
  }
}

export function finishNodeDrag(
  state: NodeDragState,
  ctx: DragContext,
): void {
  const node = ctx.nodeMap.get(state.nodeId)
  if (node) {
    ctx.emit('nodeMoved', {
      nodeId: state.nodeId,
      position: { ...node.position },
    })
  }
}
