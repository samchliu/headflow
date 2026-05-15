import { useEdges, useDraftEdge } from '@headflow/react'
import { bezierPath } from '@headflow/renderer'
import { V } from './tokens'

export interface EdgeLayerProps {
  /** Stroke colour for committed edges. Defaults to `--hf-edge-color`. */
  edgeColor?: string
  /** Stroke colour for the in-progress draft edge. Defaults to `--hf-accent`. */
  draftColor?: string
  /** Stroke width in pixels. Default: 1.5 */
  strokeWidth?: number
}

/**
 * Renders all live edges as bezier SVG paths and draws a dashed draft edge
 * while a connection is being dragged. Drop it anywhere inside `<FlowCanvas>`.
 *
 * Must be rendered inside a `<FlowProvider>`.
 *
 * @example
 * ```tsx
 * <FlowCanvas canvasRef={canvasRef}>
 *   <MyNode id="n1" ... />
 *   <EdgeLayer />
 * </FlowCanvas>
 * ```
 */
export function EdgeLayer({
  edgeColor = V.edgeColor,
  draftColor = V.accent,
  strokeWidth = 1.5,
}: EdgeLayerProps) {
  const edges = useEdges()
  const draft = useDraftEdge()

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {edges.map((e) => (
        <path
          key={e.id}
          d={bezierPath(e.source.pt, e.target.pt)}
          fill="none"
          stroke={edgeColor}
          strokeWidth={strokeWidth}
        />
      ))}
      {draft && (
        <path
          d={bezierPath(draft.sourcePt, draft.currentPt)}
          fill="none"
          stroke={draftColor}
          strokeWidth={strokeWidth}
          strokeDasharray="5 4"
        />
      )}
    </svg>
  )
}
