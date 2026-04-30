import { onCleanup } from 'solid-js'
import type { HandleType } from '@headflow/core'
import { useFlowContext } from './context'

export interface CreateHandleOptions {
  /** Unique ID within this node (e.g. "output-1"). */
  id: string
  /** 'source' — starts an edge; 'target' — receives an edge. */
  type: HandleType
  /** The nodeId of the enclosing node. */
  nodeId: string
}

export interface CreateHandleResult {
  /** Assign to the handle element's `ref` prop. */
  ref: (el: HTMLElement) => void
}

/**
 * Registers a DOM element as a flow handle (connection port).
 * Must be called inside a component wrapped by `<FlowProvider>`.
 *
 * @example
 * ```tsx
 * const { ref: outRef } = createHandle({ id: 'out', type: 'source', nodeId: props.id })
 * return <div ref={outRef} />
 * ```
 */
export function createHandle(options: CreateHandleOptions): CreateHandleResult {
  const { getEngine } = useFlowContext()

  const ref = (el: HTMLElement) => {
    const engine = getEngine()
    engine.registerHandle(options.nodeId, options.id, options.type, el)
    onCleanup(() => engine.unregisterHandle(options.nodeId, options.id))
  }

  return { ref }
}
