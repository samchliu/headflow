import { useCallback } from 'react'
import { useFlowContext } from './context'
import type { Point } from '@headflow/core'

export interface UseNodeOptions {
  /** Initial canvas-space position (applied on first mount). */
  defaultPosition?: Point
}

/**
 * Returns a callback ref that registers / unregisters the DOM element with
 * the HeadFlow engine.
 *
 * @example
 * ```tsx
 * function MyNode({ id }: { id: string }) {
 *   const nodeRef = useNode(id, { defaultPosition: { x: 100, y: 200 } })
 *   return <div ref={nodeRef} data-flow-node={id}>…</div>
 * }
 * ```
 */
export function useNode(
  nodeId: string,
  options?: UseNodeOptions,
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
        safeGetEngine()?.unregisterNode(nodeId)
        return
      }

      const engine = safeGetEngine()
      if (engine) {
        engine.registerNode(nodeId, el, options?.defaultPosition)
        return
      }

      // Engine can be briefly unavailable during mount ordering (e.g. Storybook / StrictMode).
      // Retry on the next frame once the canvas ref has initialised the engine.
      requestAnimationFrame(() => {
        if (!el.isConnected) return
        safeGetEngine()?.registerNode(nodeId, el, options?.defaultPosition)
      })
    },
    // Re-register when nodeId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId],
  )

  return ref
}
