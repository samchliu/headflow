import { useEffect } from 'react'
import { useFlowContext } from './context'
import type { Point } from '@headflow/core'

export interface UseNodeRemovalHandlers {
  /**
   * Fired when `engine.removeNode()` / `engine.deleteSelection()` removes a
   * node. Remove this node id from your OWN node-list state so React
   * unmounts it — core does not (and cannot) unmount your JSX itself.
   */
  onRemoveRequested: (nodeId: string) => void
  /**
   * Fired when a node removal is undone. Core only supplies the node's
   * last-known canvas position as a convenience for repositioning it — it
   * does not retain the node's props/children. If you want delete-undo to
   * fully restore the node, you're responsible for keeping hold of its full
   * data yourself (e.g. in a small ref/stack) and re-inserting it here.
   */
  onRestoreRequested?: (nodeId: string, position: Point) => void
}

/**
 * Subscribes to the engine's node-removal request/undo events. Node deletion
 * is only "partially automatic": core fully restores the edges and selection
 * state connected to a removed node, but since it doesn't own your node's
 * React props/children, reappearing the node itself is your responsibility.
 *
 * @example
 * ```tsx
 * const [nodes, setNodes] = useState(initialNodes)
 * const removed = useRef(new Map<string, MyNodeData>())
 *
 * useNodeRemoval({
 *   onRemoveRequested: (nodeId) => {
 *     setNodes((ns) => {
 *       const node = ns.find((n) => n.id === nodeId)
 *       if (node) removed.current.set(nodeId, node)
 *       return ns.filter((n) => n.id !== nodeId)
 *     })
 *   },
 *   onRestoreRequested: (nodeId, position) => {
 *     const data = removed.current.get(nodeId)
 *     if (data) setNodes((ns) => [...ns, { ...data, position }])
 *   },
 * })
 * ```
 */
export function useNodeRemoval(handlers: UseNodeRemovalHandlers): void {
  const { getEngine } = useFlowContext()
  const { onRemoveRequested, onRestoreRequested } = handlers

  useEffect(() => {
    const engine = getEngine()

    function handleRemove({ nodeId }: { nodeId: string }) {
      onRemoveRequested(nodeId)
    }

    function handleRestore({ nodeId, position }: { nodeId: string; position: Point }) {
      onRestoreRequested?.(nodeId, position)
    }

    engine.on('nodeRemoveRequested', handleRemove)
    engine.on('nodeRestoreRequested', handleRestore)

    return () => {
      engine.off('nodeRemoveRequested', handleRemove)
      engine.off('nodeRestoreRequested', handleRestore)
    }
  // getEngine is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRemoveRequested, onRestoreRequested])
}
