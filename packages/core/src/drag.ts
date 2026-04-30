import type { CanvasTransform, Edge, HandleEntry, NodeEntry, Point } from './types'
import { toCanvasSpace } from './transform'

interface DragOptions {
  allowSelfLoop: boolean
}

type NodeDragState = {
  type: 'node'
  nodeId: string
  el: HTMLElement
  startPointerX: number
  startPointerY: number
  startNodeX: number
  startNodeY: number
}

type EdgeDragState = {
  type: 'edge'
  sourceNodeId: string
  sourceHandleId: string
}

type DragState = NodeDragState | EdgeDragState

/**
 * Attach pointer event listeners to handle node dragging and edge creation.
 * Returns a cleanup function to remove all listeners.
 *
 * Event delegation strategy:
 * - Listen on container (pointerdown) and document (pointermove, pointerup).
 * - Handle elements take priority over node elements when both are hit.
 */
export function setupDrag(
  container: HTMLElement,
  nodeMap: Map<string, NodeEntry>,
  handleMap: Map<string, HandleEntry>,
  handleElToKey: Map<HTMLElement, string>,
  edgeMap: Map<string, Edge>,
  getTransform: () => CanvasTransform,
  emit: <T>(event: string, data: T) => void,
  recalcHandlesForNode: (nodeId: string) => void,
  options: DragOptions,
): () => void {
  let dragState: DragState | null = null
  let rafId: number | null = null
  let pendingEvent: PointerEvent | null = null

  // ── pointerdown ────────────────────────────────────────────────────────────

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return

    const target = e.target as Element
    const handleEl = target.closest('[data-flow-handle]') as HTMLElement | null
    const nodeEl = target.closest('[data-flow-node]') as HTMLElement | null

    if (handleEl) {
      // Handle drag → start edge creation
      const handleType = handleEl.getAttribute('data-flow-handle')
      if (handleType !== 'source') return

      const handleId = handleEl.getAttribute('data-flow-handle-id')
      const nodeId = nodeEl?.getAttribute('data-flow-node')
      if (!handleId || !nodeId) return

      dragState = { type: 'edge', sourceNodeId: nodeId, sourceHandleId: handleId }
      e.preventDefault()
    } else if (nodeEl) {
      // Node drag
      const nodeId = nodeEl.getAttribute('data-flow-node')
      if (!nodeId) return

      const node = nodeMap.get(nodeId)
      if (!node) return

      dragState = {
        type: 'node',
        nodeId,
        el: nodeEl as HTMLElement,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startNodeX: node.position.x,
        startNodeY: node.position.y,
      }
      e.preventDefault()
    }
  }

  // ── pointermove (rAF-throttled) ────────────────────────────────────────────

  function processMove(e: PointerEvent) {
    if (!dragState) return

    const t = getTransform()

    if (dragState.type === 'node') {
      const dx = (e.clientX - dragState.startPointerX) / t.scale
      const dy = (e.clientY - dragState.startPointerY) / t.scale
      const newX = dragState.startNodeX + dx
      const newY = dragState.startNodeY + dy

      const node = nodeMap.get(dragState.nodeId)
      if (!node) return

      node.position = { x: newX, y: newY }
      node.el.style.transform = `translate(${newX}px, ${newY}px)`
      recalcHandlesForNode(dragState.nodeId)
    } else {
      // edge drag
      const cr = container.getBoundingClientRect()
      const viewportPt: Point = {
        x: e.clientX - cr.left,
        y: e.clientY - cr.top,
      }
      emit('draftEdgeMove', {
        sourceHandleId: dragState.sourceHandleId,
        sourceNodeId: dragState.sourceNodeId,
        currentPt: toCanvasSpace(viewportPt, t),
      })
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragState) return
    pendingEvent = e
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        if (pendingEvent) {
          processMove(pendingEvent)
          pendingEvent = null
        }
        rafId = null
      })
    }
  }

  // ── pointerup ─────────────────────────────────────────────────────────────

  function onPointerUp(e: PointerEvent) {
    if (!dragState) return

    if (dragState.type === 'node') {
      const node = nodeMap.get(dragState.nodeId)
      if (node) {
        emit('nodeMoved', {
          nodeId: dragState.nodeId,
          position: { ...node.position },
        })
      }
    } else {
      // Finalize edge creation
      const target = e.target as Element
      const targetHandleEl = target.closest('[data-flow-handle]') as HTMLElement | null
      const targetNodeEl = target.closest('[data-flow-node]') as HTMLElement | null
      let created = false

      if (targetHandleEl && targetNodeEl) {
        const targetHandleType = targetHandleEl.getAttribute('data-flow-handle')
        const targetHandleId = targetHandleEl.getAttribute('data-flow-handle-id')
        const targetNodeId = targetNodeEl.getAttribute('data-flow-node')

        if (targetHandleType === 'target' && targetHandleId && targetNodeId) {
          const isSelfLoop = targetNodeId === dragState.sourceNodeId
          if (!options.allowSelfLoop && isSelfLoop) {
            // intentionally skip — fall through to cancel
          } else {
            const allowMultiple = targetHandleEl.hasAttribute('data-flow-handle-multiple')
            const alreadyConnected =
              !allowMultiple && hasEdgeForTargetHandle(edgeMap, targetNodeId, targetHandleId)

            if (!alreadyConnected) {
              const srcKey = `${dragState.sourceNodeId}::${dragState.sourceHandleId}`
              const tgtKey = `${targetNodeId}::${targetHandleId}`
              const srcHandle = handleMap.get(srcKey)
              const tgtHandle = handleMap.get(tgtKey)

              if (srcHandle && tgtHandle) {
                const edge: Edge = {
                  id: `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                  source: {
                    nodeId: dragState.sourceNodeId,
                    handleId: dragState.sourceHandleId,
                    pt: { ...srcHandle.pt },
                  },
                  target: {
                    nodeId: targetNodeId,
                    handleId: targetHandleId,
                    pt: { ...tgtHandle.pt },
                  },
                }
                edgeMap.set(edge.id, edge)
                emit('edgeCreated', { edge })
                created = true
              }
            }
          }
        }
      }

      if (!created) {
        emit('edgeCreateCancelled', {
          sourceHandleId: dragState.sourceHandleId,
          sourceNodeId: dragState.sourceNodeId,
        })
      }
    }

    flush()
  }

  function flush() {
    dragState = null
    pendingEvent = null
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  container.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
  document.addEventListener('pointercancel', onPointerUp)

  return function cleanupDrag() {
    container.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
    document.removeEventListener('pointercancel', onPointerUp)
    flush()
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
