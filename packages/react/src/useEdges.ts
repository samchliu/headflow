import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useFlowContext } from './context'
import type { Edge } from '@headflow/core'

/**
 * Returns the live list of edges, re-rendering only when edges are created or
 * deleted (not on every `nodeMoved`).
 *
 * Uses `useSyncExternalStore` for tear-free reads in concurrent React.
 *
 * @example
 * ```tsx
 * function EdgeLayer() {
 *   const edges = useEdges()
 *   return <svg>…</svg>
 * }
 * ```
 */
export function useEdges(): Edge[] {
  const { getEngine } = useFlowContext()

  // Snapshot ref — updated on edge events only
  const snapshotRef = useRef<Edge[]>([])

  // Version counter used to notify useSyncExternalStore of change
  const versionRef = useRef(0)
  const listenersRef = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    const engine = getEngine()

    function invalidate(reason: 'edgeCreated' | 'edgeDeleted' | 'nodeMoved') {
      snapshotRef.current = engine.getEdges()
      versionRef.current++
      for (const l of listenersRef.current) l()
    }

    const onEdgeCreated = () => invalidate('edgeCreated')
    const onEdgeDeleted = () => invalidate('edgeDeleted')
    const onNodeMoved = () => invalidate('nodeMoved')

    engine.on('edgeCreated', onEdgeCreated)
    engine.on('edgeDeleted', onEdgeDeleted)
    engine.on('nodeMoved', onNodeMoved)

    // Sync on mount
    onEdgeCreated()

    return () => {
      engine.off('edgeCreated', onEdgeCreated)
      engine.off('edgeDeleted', onEdgeDeleted)
      engine.off('nodeMoved', onNodeMoved)
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
