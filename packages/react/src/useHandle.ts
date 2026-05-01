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
      if (!el) {
        getEngine().unregisterHandle(nodeId, handleId)
        return
      }
      getEngine().registerHandle(nodeId, handleId, type, el)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId, handleId, type],
  )

  return ref
}
