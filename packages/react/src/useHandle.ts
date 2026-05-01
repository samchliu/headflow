import { useCallback } from 'react'
import { useFlowContext } from './context'
import type { HandleType } from '@headflow/core'

/**
 * Returns a callback ref that registers / unregisters the DOM element as a
 * handle with the HeadFlow engine.
 *
 * @example
 * ```tsx
 * function OutputHandle({ nodeId }: { nodeId: string }) {
 *   const handleRef = useHandle(nodeId, 'out', 'source')
 *   return <div ref={handleRef} data-flow-handle="source" data-flow-handle-id="out" />
 * }
 * ```
 */
export function useHandle(
  nodeId: string,
  handleId: string,
  type: HandleType,
): (el: HTMLElement | null) => void {
  const { getEngine } = useFlowContext()

  const ref = useCallback(
    (el: HTMLElement | null) => {
      const safeGetEngine = () => {
        try {
          return getEngine()
        } catch {
          return null
        }
      }

      if (!el) {
        safeGetEngine()?.unregisterHandle(nodeId, handleId)
        return
      }

      // Always write attributes first so core can discover handles via initial scan /
      // MutationObserver even if engine init lags behind this ref callback.
      if (!el.hasAttribute('data-flow-handle')) {
        el.setAttribute('data-flow-handle', type)
      }
      if (!el.hasAttribute('data-flow-handle-id')) {
        el.setAttribute('data-flow-handle-id', handleId)
      }

      const engine = safeGetEngine()
      if (engine) {
        engine.registerHandle(nodeId, handleId, type, el)
        return
      }

      // Engine may not be ready on the exact ref callback tick.
      requestAnimationFrame(() => {
        if (!el.isConnected) return
        safeGetEngine()?.registerHandle(nodeId, handleId, type, el)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId, handleId, type],
  )

  return ref
}
