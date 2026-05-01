import type { DragContext, EdgeDragState } from './types'
import type { Edge, Point } from '../types'
import { getElementCanvasCenter, toCanvasSpace } from '../transform'

export function startEdgeDrag(
  e: PointerEvent,
  handleEl: HTMLElement,
  nodeEl: HTMLElement,
): EdgeDragState | null {
  const handleType = handleEl.getAttribute('data-flow-handle')
  if (handleType !== 'source') return null

  const handleId = handleEl.getAttribute('data-flow-handle-id')
  const nodeId = nodeEl.getAttribute('data-flow-node')
  if (!handleId || !nodeId) return null

  return {
    type: 'edge',
    sourceNodeId: nodeId,
    sourceHandleId: handleId,
    sourceHandleEl: handleEl,
  }
}

export function processEdgeMove(
  e: PointerEvent,
  state: EdgeDragState,
  ctx: DragContext,
): void {
  const t = ctx.getTransform()
  const cr = ctx.container.getBoundingClientRect()
  const viewportPt: Point = {
    x: e.clientX - cr.left,
    y: e.clientY - cr.top,
  }

  const srcKey = `${state.sourceNodeId}::${state.sourceHandleId}`
  const srcHandle = ctx.handleMap.get(srcKey)
  const sourcePt: Point =
    srcHandle?.pt ?? getElementCanvasCenter(state.sourceHandleEl, ctx.container, t)

  ctx.emit('draftEdgeMove', {
    sourceHandleId: state.sourceHandleId,
    sourceNodeId: state.sourceNodeId,
    sourcePt,
    currentPt: toCanvasSpace(viewportPt, t),
  })
}

export function finishEdgeDrag(
  e: PointerEvent,
  state: EdgeDragState,
  ctx: DragContext,
): void {
  const target = e.target as Element
  const targetHandleEl = target.closest('[data-flow-handle]') as HTMLElement | null
  const targetNodeEl = target.closest('[data-flow-node]') as HTMLElement | null
  let created = false

  if (targetHandleEl && targetNodeEl) {
    const targetHandleType = targetHandleEl.getAttribute('data-flow-handle')
    const targetHandleId = targetHandleEl.getAttribute('data-flow-handle-id')
    const targetNodeId = targetNodeEl.getAttribute('data-flow-node')

    if (targetHandleType === 'target' && targetHandleId && targetNodeId) {
      const isSelfLoop = targetNodeId === state.sourceNodeId
      if (!ctx.options.allowSelfLoop && isSelfLoop) {
        // fall through to cancel
      } else {
        const allowMultiple = targetHandleEl.hasAttribute('data-flow-handle-multiple')
        const alreadyConnected =
          !allowMultiple && hasEdgeForTargetHandle(ctx.edgeMap, targetNodeId, targetHandleId)

        if (!alreadyConnected) {
          const srcKey = `${state.sourceNodeId}::${state.sourceHandleId}`
          const tgtKey = `${targetNodeId}::${targetHandleId}`
          const srcHandle = ctx.handleMap.get(srcKey)
          const tgtHandle = ctx.handleMap.get(tgtKey)

          if (srcHandle && tgtHandle) {
            const edge: Edge = {
              id: `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              source: {
                nodeId: state.sourceNodeId,
                handleId: state.sourceHandleId,
                pt: { ...srcHandle.pt },
              },
              target: {
                nodeId: targetNodeId,
                handleId: targetHandleId,
                pt: { ...tgtHandle.pt },
              },
            }
            ctx.edgeMap.set(edge.id, edge)
            ctx.emit('edgeCreated', { edge })
            created = true

            // Record undo/redo for edge creation
            if (ctx.history) {
              const snapshot = {
                ...edge,
                source: { ...edge.source, pt: { ...edge.source.pt } },
                target: { ...edge.target, pt: { ...edge.target.pt } },
              }
              ctx.history.record({
                undo() {
                  if (!ctx.edgeMap.has(snapshot.id)) return
                  ctx.edgeMap.delete(snapshot.id)
                  ctx.emit('edgeDeleted', { edgeId: snapshot.id })
                },
                redo() {
                  if (ctx.edgeMap.has(snapshot.id)) return
                  ctx.edgeMap.set(snapshot.id, snapshot)
                  ctx.emit('edgeCreated', { edge: snapshot })
                },
              })
            }
          }
        }
      }
    }
  }

  if (!created) {
    ctx.emit('edgeCreateCancelled', {
      sourceHandleId: state.sourceHandleId,
      sourceNodeId: state.sourceNodeId,
    })
  }
}

function hasEdgeForTargetHandle(
  edgeMap: Map<string, Edge>,
  targetNodeId: string,
  targetHandleId: string,
): boolean {
  for (const edge of edgeMap.values()) {
    if (edge.target.nodeId === targetNodeId && edge.target.handleId === targetHandleId) {
      return true
    }
  }
  return false
}
