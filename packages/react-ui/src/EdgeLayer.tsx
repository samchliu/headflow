import { useEdges, useDraftEdge, useSelection } from '@headflow/react'
import { bezierPath } from '@headflow/renderer'
import { V } from './tokens'

export interface EdgeLayerProps {
  /** Stroke colour for committed edges. Defaults to `--hf-edge-color`. */
  edgeColor?: string
  /** Stroke colour for the in-progress draft edge. Defaults to `--hf-accent`. */
  draftColor?: string
  /** Stroke width in pixels. Default: 1.5 */
  strokeWidth?: number
  /** Stroke colour for selected edges. Defaults to `--hf-edge-selected`. */
  selectedColor?: string
  /** Stroke width for selected edges. Default: `strokeWidth + 1` */
  selectedStrokeWidth?: number
  /** Invisible stroke width (px) used for the edge's click/hit target. Default: 20 */
  interactionWidth?: number
}

/**
 * Renders all live edges as bezier SVG paths and draws a dashed draft edge
 * while a connection is being dragged. Drop it anywhere inside `<FlowCanvas>`.
 * Edges are click-selectable (via a generous invisible hit path) and are
 * unified into the same selection set as nodes.
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
  selectedColor = V.edgeSelected,
  selectedStrokeWidth,
  interactionWidth = 20,
}: EdgeLayerProps) {
  const edges = useEdges()
  const draft = useDraftEdge()
  const selected = useSelection()

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
      {edges.map((e) => {
        const isSelected = selected.has(e.id)
        const d = bezierPath(e.source.pt, e.target.pt)
        return (
          <g key={e.id}>
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={interactionWidth}
              style={{ pointerEvents: 'stroke' }}
              data-flow-edge={e.id}
            />
            <path
              d={d}
              fill="none"
              stroke={isSelected ? selectedColor : edgeColor}
              strokeWidth={isSelected ? (selectedStrokeWidth ?? strokeWidth + 1) : strokeWidth}
              data-flow-edge={e.id}
              data-selected={isSelected || undefined}
            />
          </g>
        )
      })}
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
