import { type Accessor, createSignal, onCleanup, onMount } from 'solid-js'
import type { Edge } from '@headflow/core'
import { useFlowContext } from './context'

/**
 * Returns a reactive accessor to the current list of edges.
 * Automatically refreshes when edges are created, deleted, or when a node
 * moves (causing edge endpoint coordinates to change).
 *
 * Must be called inside a component wrapped by `<FlowProvider>`.
 *
 * @example
 * ```tsx
 * const edges = createEdges()
 * return (
 *   <svg>
 *     <For each={edges()}>{(edge) => <path d={bezier(edge.source.pt, edge.target.pt)} />}</For>
 *   </svg>
 * )
 * ```
 */
export function createEdges(): Accessor<Edge[]> {
  const { getEngine } = useFlowContext()
  const [edges, setEdges] = createSignal<Edge[]>([])

  const refresh = () => setEdges(getEngine().getEdges())

  onMount(() => {
    const engine = getEngine()
    // Initial snapshot
    setEdges(engine.getEdges())

    engine.on('edgeCreated', refresh)
    engine.on('edgeDeleted', refresh)
    // Refresh endpoint coordinates when a node moves
    engine.on('nodeMoved', refresh)

    onCleanup(() => {
      engine.off('edgeCreated', refresh)
      engine.off('edgeDeleted', refresh)
      engine.off('nodeMoved', refresh)
    })
  })

  return edges
}
