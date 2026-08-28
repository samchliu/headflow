import type { CSSProperties, ReactNode } from 'react'
import { useEdges } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { edgeMidpoint } from '@headflow/renderer'

export interface EdgeLabelsProps {
  /**
   * Render arbitrary content for an edge's label. Return `null`/`undefined`
   * to render nothing for that edge — no wrapper is emitted, so there's no
   * leftover invisible clickable area.
   *
   * Note: `useEdges()` invalidates its whole snapshot on any `nodeMoved`
   * event (same as `EdgeLayer`), so this is re-invoked for every edge on
   * every frame of any node drag, not just edges touching the dragged node.
   * Keep it cheap, or memoize expensive content yourself, at high edge counts.
   */
  renderLabel: (edge: Edge) => ReactNode
  /** Override the outer layer's styles. */
  style?: CSSProperties
  className?: string
}

/**
 * Renders custom content at each edge's midpoint — captions, badges, or
 * interactive controls. The content you return is fully yours; HeadFlow only
 * positions it and wires up click-to-select.
 *
 * Each label wrapper carries the same `data-flow-edge` attribute as
 * `EdgeLayer`'s hit path, so clicking (or shift-clicking) a label selects or
 * toggles its edge through the exact same interaction the edge line itself
 * uses — no core changes needed. If your label content has its own
 * interactive elements (e.g. a delete button) and you want to opt out of
 * that click-to-select behaviour, call `e.stopPropagation()` in a
 * `onPointerDown` handler on that element — selection is decided at
 * `pointerdown`, so stopping propagation on `click` alone is too late.
 *
 * Must be rendered inside a `<FlowProvider>`, alongside `<EdgeLayer />`.
 *
 * @example
 * ```tsx
 * <FlowCanvas canvasRef={canvasRef}>
 *   <MyNode id="n1" ... />
 *   <EdgeLayer />
 *   <EdgeLabels renderLabel={(edge) => <span>{labels[edge.id]}</span>} />
 * </FlowCanvas>
 * ```
 */
export function EdgeLabels({ renderLabel, style, className }: EdgeLabelsProps) {
  const edges = useEdges()

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {edges.map((e) => {
        const content = renderLabel(e)
        if (content == null || content === false) return null

        const { x, y } = edgeMidpoint(e.source.pt, e.target.pt)
        return (
          <div
            key={e.id}
            data-flow-edge={e.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
            }}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
