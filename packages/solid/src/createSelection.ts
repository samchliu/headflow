import { createSignal, onMount, onCleanup } from 'solid-js'
import { useFlowContext } from './context'
import type { Rect } from '@headflow/core'

/**
 * Returns a reactive accessor with the current selected node id set.
 * Updates whenever the engine emits `selectionChanged`.
 *
 * @example
 * ```tsx
 * const selection = createSelection()
 * <div class={selection().has(props.id) ? 'selected' : ''}>…</div>
 * ```
 */
export function createSelection() {
  const { getEngine } = useFlowContext()
  const [selected, setSelected] = createSignal<Set<string>>(new Set())

  onMount(() => {
    const engine = getEngine()

    // Sync initial state
    setSelected(engine.getSelection())

    const handler = ({ selected }: { selected: Set<string> }) => {
      setSelected(new Set(selected))
    }
    engine.on('selectionChanged', handler)
    onCleanup(() => engine.off('selectionChanged', handler))
  })

  return selected
}

/**
 * Returns a reactive accessor with the current lasso rect (viewport space),
 * or `null` when no lasso drag is active.
 *
 * @example
 * ```tsx
 * const lasso = createLasso()
 * <Show when={lasso()}>
 *   {(r) => <div style={{ position: 'absolute', left: `${r().x}px`, ... }} />}
 * </Show>
 * ```
 */
export function createLasso() {
  const { getEngine } = useFlowContext()
  const [rect, setRect] = createSignal<Rect | null>(null)

  onMount(() => {
    const engine = getEngine()

    const onUpdate = ({ rect }: { rect: Rect }) => setRect({ ...rect })
    const onEnd = () => setRect(null)

    engine.on('lassoUpdate', onUpdate)
    engine.on('lassoEnd', onEnd)

    onCleanup(() => {
      engine.off('lassoUpdate', onUpdate)
      engine.off('lassoEnd', onEnd)
    })
  })

  return rect
}
