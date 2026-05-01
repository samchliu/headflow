import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useFlowContext } from './context'
import type { Rect } from '@headflow/core'

/**
 * Returns the current selection set, re-rendering only when selection changes.
 * Uses `useSyncExternalStore` for concurrent-safe reads.
 *
 * @example
 * ```tsx
 * const selected = useSelection()
 * <div className={selected.has(id) ? 'ring-2 ring-indigo-500' : ''}>…</div>
 * ```
 */
export function useSelection(): Set<string> {
  const { getEngine } = useFlowContext()

  const snapshotRef = useRef<Set<string>>(new Set())
  const listenersRef = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    const engine = getEngine()

    function onSelectionChanged({ selected }: { selected: Set<string> }) {
      snapshotRef.current = new Set(selected)
      for (const l of listenersRef.current) l()
    }

    snapshotRef.current = engine.getSelection()
    engine.on('selectionChanged', onSelectionChanged)
    return () => engine.off('selectionChanged', onSelectionChanged)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subscribe = useCallback((onChange: () => void) => {
    listenersRef.current.add(onChange)
    return () => { listenersRef.current.delete(onChange) }
  }, [])

  const getSnapshot = useCallback(() => snapshotRef.current, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Returns the current lasso rect (viewport space) or `null` when no lasso is
 * active. Triggers a re-render on every `lassoUpdate` tick (rAF throttled).
 *
 * @example
 * ```tsx
 * const lasso = useLasso()
 * {lasso && (
 *   <div className="lasso-box" style={{ left: lasso.x, top: lasso.y, width: lasso.w, height: lasso.h }} />
 * )}
 * ```
 */
export function useLasso(): Rect | null {
  const { getEngine } = useFlowContext()

  const snapshotRef = useRef<Rect | null>(null)
  const listenersRef = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    const engine = getEngine()

    function onUpdate({ rect }: { rect: Rect }) {
      snapshotRef.current = { ...rect }
      for (const l of listenersRef.current) l()
    }

    function onEnd() {
      snapshotRef.current = null
      for (const l of listenersRef.current) l()
    }

    engine.on('lassoUpdate', onUpdate)
    engine.on('lassoEnd', onEnd)
    return () => {
      engine.off('lassoUpdate', onUpdate)
      engine.off('lassoEnd', onEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subscribe = useCallback((onChange: () => void) => {
    listenersRef.current.add(onChange)
    return () => { listenersRef.current.delete(onChange) }
  }, [])

  const getSnapshot = useCallback(() => snapshotRef.current, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
