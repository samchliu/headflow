import type { DragContext, DragState } from './types'
import { startNodeDrag, processNodeMove, finishNodeDrag } from './node'
import { startEdgeDrag, processEdgeMove, finishEdgeDrag } from './edge'
import { startLassoDrag, processLassoMove, finishLassoDrag } from './lasso'

export function setupDrag(ctx: DragContext): () => void {
  let dragState: DragState = null
  let rafId: number | null = null

  // ── Pointer down — determine which drag mode to start ────────────────────

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return

    const target = e.target as Element

    // Priority 1: handle element (edge drag)
    const handleEl = target.closest('[data-flow-handle]') as HTMLElement | null
    const nodeEl = target.closest('[data-flow-node]') as HTMLElement | null

    if (handleEl && nodeEl) {
      const state = startEdgeDrag(e, handleEl, nodeEl)
      if (state) {
        dragState = state
        ctx.container.setPointerCapture(e.pointerId)
        return
      }
    }

    // Priority 2: node element (node drag)
    if (nodeEl) {
      const state = startNodeDrag(e, nodeEl, ctx)
      if (state) {
        dragState = state
        ctx.container.setPointerCapture(e.pointerId)

        // If clicked node is NOT in selection, replace selection with just this node
        if (!ctx.selection.has(state.nodeId)) {
          ctx.selection.clearSelection()
          ctx.selection.select(state.nodeId)
        }
        return
      }
    }

    // Priority 3: empty canvas space — start lasso
    if (target === ctx.container || ctx.container.contains(target as Node)) {
      const clickedOnNode = !!nodeEl
      if (!clickedOnNode) {
        if (!e.shiftKey) ctx.selection.clearSelection()
        dragState = startLassoDrag(e, ctx.container)
        ctx.container.setPointerCapture(e.pointerId)
      }
    }
  }

  // ── Pointer move — rAF throttled ──────────────────────────────────────────

  function onPointerMove(e: PointerEvent): void {
    if (!dragState) return
    if (rafId !== null) return

    rafId = requestAnimationFrame(() => {
      rafId = null
      if (!dragState) return

      switch (dragState.type) {
        case 'node':
          processNodeMove(e, dragState, ctx)
          break
        case 'edge':
          processEdgeMove(e, dragState, ctx)
          break
        case 'lasso':
          processLassoMove(e, dragState, ctx)
          break
      }
    })
  }

  // ── Pointer up — commit or cancel ────────────────────────────────────────

  function onPointerUp(e: PointerEvent): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    if (!dragState) return

    switch (dragState.type) {
      case 'node':
        finishNodeDrag(dragState, ctx)
        break
      case 'edge':
        finishEdgeDrag(e, dragState, ctx)
        break
      case 'lasso':
        finishLassoDrag(e, dragState, ctx)
        break
    }

    dragState = null
  }

  ctx.container.addEventListener('pointerdown', onPointerDown)
  ctx.container.addEventListener('pointermove', onPointerMove)
  ctx.container.addEventListener('pointerup', onPointerUp)
  ctx.container.addEventListener('pointercancel', onPointerUp)

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    ctx.container.removeEventListener('pointerdown', onPointerDown)
    ctx.container.removeEventListener('pointermove', onPointerMove)
    ctx.container.removeEventListener('pointerup', onPointerUp)
    ctx.container.removeEventListener('pointercancel', onPointerUp)
  }
}
