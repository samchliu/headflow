import { onCleanup } from 'solid-js'
import type { Point } from '@headflow/core'
import { useFlowContext } from './context'

export interface CreateNodeOptions {
  /** Initial canvas-space position. Used by the lib to set style.transform on mount. */
  defaultPosition?: Point
}

export interface CreateNodeResult {
  /** Assign to the node element's `ref` prop. */
  ref: (el: HTMLElement) => void
}

/**
 * Registers a DOM element as a flow node.
 * Must be called inside a component tree wrapped by `<FlowProvider>`.
 *
 * @param nodeId - Unique, stable ID for this node
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * function MyNode(props: { id: string; defaultPosition: Point }) {
 *   const { ref } = createNode(props.id, { defaultPosition: props.defaultPosition })
 *   return <div ref={ref}>...</div>
 * }
 * ```
 */
export function createNode(nodeId: string, options?: CreateNodeOptions): CreateNodeResult {
  const { getEngine } = useFlowContext()

  const ref = (el: HTMLElement) => {
    const engine = getEngine()

    // Apply defaultPosition as the initial transform before registration
    // so that getNodeInitialPosition() (offsetLeft/offsetTop) would be 0 —
    // we skip that path and pass the position explicitly instead.
    if (options?.defaultPosition) {
      const { x, y } = options.defaultPosition
      el.style.transform = `translate(${x}px, ${y}px)`
    }

    engine.registerNode(nodeId, el, options?.defaultPosition)

    onCleanup(() => engine.unregisterNode(nodeId))
  }

  return { ref }
}
