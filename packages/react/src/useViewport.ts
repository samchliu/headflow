import { useCallback, useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import { useFlowContext } from './context'
import type { CanvasTransform } from '@headflow/core'

const DEFAULT: CanvasTransform = { scale: 1, translateX: 0, translateY: 0 }

/**
 * Returns the current viewport transform, re-rendering whenever it changes.
 * Uses `useSyncExternalStore` for concurrent-safe reads.
 *
 * @example
 * ```tsx
 * const { scale, translateX, translateY } = useViewport()
 * // apply to a world layer
 * <div style={{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }}>
 *   {children}
 * </div>
 * ```
 */
export function useViewport(): CanvasTransform {
  const { getEngine } = useFlowContext()

  const snapshotRef = useRef<CanvasTransform>(DEFAULT)
  const listenersRef = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    const engine = getEngine()

    function onViewportChanged(t: CanvasTransform) {
      snapshotRef.current = { ...t }
      for (const l of listenersRef.current) l()
    }

    snapshotRef.current = engine.getViewport()
    engine.on('viewportChanged', onViewportChanged)
    return () => engine.off('viewportChanged', onViewportChanged)
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
