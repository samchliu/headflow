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
        applyClickSelect(ctx, state.nodeId, e.shiftKey)
        return
      }
    }

    // Priority 2.5: edge element (click-select only, edges aren't draggable)
    const edgeEl = target.closest('[data-flow-edge]') as HTMLElement | null
    if (edgeEl) {
      // Any click landing on an edge/label element is consumed here — even a
      // stale one (removed from edgeMap but not yet unmounted) — so it never
      // falls through to Priority 3 and unexpectedly clears the selection.
      const edgeId = edgeEl.getAttribute('data-flow-edge')
      if (edgeId && ctx.edgeMap.has(edgeId)) {
        applyClickSelect(ctx, edgeId, e.shiftKey)
      }
      return
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

  /**
   * Shared click-select semantics for both node and edge clicks:
   * shift+click toggles the item in/out of the selection; a plain click
   * replaces the selection with just this item, unless it's already part of
   * a multi-selection (preserves group-drag when clicking an already-selected node).
   */
  function applyClickSelect(ctx: DragContext, id: string, shiftKey: boolean): void {
    if (shiftKey) {
      ctx.selection.toggle(id)
    } else if (!ctx.selection.has(id)) {
      ctx.selection.clearSelection()
      ctx.selection.select(id)
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
