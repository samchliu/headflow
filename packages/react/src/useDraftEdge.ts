import { useCallback, useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { useFlowContext } from './context'
import type { Point } from '@headflow/core'

export interface DraftEdge {
  sourceNodeId: string
  sourceHandleId: string
  sourcePt: Point
  currentPt: Point
}

/**
 * Returns the in-progress draft edge while the user is dragging from a source
 * handle, or `null` when no drag is active.
 *
 * Combines `draftEdgeMove`, `edgeCreateCancelled`, and `edgeCreated` into one
 * value so you only need a single hook to render a preview edge.
 *
 * @example
 * ```tsx
 * const draft = useDraftEdge()
 * {draft && (
 *   <path d={bezierPath(draft.sourcePt, draft.currentPt)} strokeDasharray="5 4" />
 * )}
 * ```
 */
export function useDraftEdge(): DraftEdge | null {
  const { getEngine } = useFlowContext()

  const snapshotRef = useRef<DraftEdge | null>(null)
  const listenersRef = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    const engine = getEngine()

    function notify() {
      for (const l of listenersRef.current) l()
    }

    function onMove({
      sourceNodeId,
      sourceHandleId,
      sourcePt,
      currentPt,
    }: {
      sourceNodeId: string
      sourceHandleId: string
      sourcePt: Point
      currentPt: Point
    }) {
      snapshotRef.current = { sourceNodeId, sourceHandleId, sourcePt: { ...sourcePt }, currentPt: { ...currentPt } }
      notify()
    }

    function onClear() {
      snapshotRef.current = null
      notify()
    }

    engine.on('draftEdgeMove', onMove)
    engine.on('edgeCreateCancelled', onClear)
    engine.on('edgeCreated', onClear)

    return () => {
      engine.off('draftEdgeMove', onMove)
      engine.off('edgeCreateCancelled', onClear)
      engine.off('edgeCreated', onClear)
    }
  // getEngine is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subscribe = useCallback((onChange: () => void) => {
    listenersRef.current.add(onChange)
    return () => { listenersRef.current.delete(onChange) }
  }, [])

  const getSnapshot = useCallback(() => snapshotRef.current, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
