import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useEdges, useFlowContext, useHandle, useNode, useSelection } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { bezierPath } from '@headflow/renderer'

export const T = {
  bg: '#0d0d0d',
  surface: '#141414',
  border: '#262626',
  accent: '#6366f1',
  green: '#10b981',
  amber: '#f59e0b',
  edge: '#818cf8',
  text: '#f0f0f0',
  muted: '#8a8a8a',
  dot: '#2a2a2a',
} as const

/** Reusable demo node with one target handle (left) and one source handle (right). */
export function SimpleNode({
  id,
  label,
  kind = 'default',
  defaultPosition,
}: {
  /** Engine node ID — must be unique within the canvas. */
  id: string
  /** Text displayed inside the node. */
  label: string
  /** Controls the top-border accent color: green for input, amber for output, indigo for default. */
  kind?: 'input' | 'default' | 'output'
  /** Initial canvas-space position in pixels. */
  defaultPosition: { x: number; y: number }
}) {
  const nodeRef = useNode(id, { defaultPosition })
  const srcRef = useHandle(id, 'output', 'source')
  const tgtRef = useHandle(id, 'input', 'target')
  const isSelected = useSelection().has(id)
  const topColor = kind === 'input' ? T.green : kind === 'output' ? T.amber : T.accent

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 140,
        background: isSelected ? '#1a1836' : T.surface,
        border: `1.5px solid ${isSelected ? T.accent : T.border}`,
        borderTop: `4px solid ${topColor}`,
        borderRadius: 8,
        padding: '10px 14px',
        cursor: 'grab',
        userSelect: 'none',
        color: T.text,
        fontSize: 13,
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <div
        ref={tgtRef}
        data-flow-handle="target"
        data-flow-handle-id="input"
        style={{
          position: 'absolute',
          left: -7,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: T.accent,
          border: `2px solid ${T.bg}`,
          cursor: 'crosshair',
        }}
      />
      {label}
      <div
        ref={srcRef}
        data-flow-handle="source"
        data-flow-handle-id="output"
        style={{
          position: 'absolute',
          right: -7,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: T.green,
          border: `2px solid ${T.bg}`,
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}

/** Renders all live edges as bezier SVG paths and draws a dashed draft edge while a connection is being dragged. */
export function EdgeLayer() {
  const { getEngine } = useFlowContext()
  const edges = useEdges()
  const [draft, setDraft] = useState<{ sx: number; sy: number; cx: number; cy: number } | null>(null)

  useEffect(() => {
    const engine = getEngine()
    const onMove = ({
      sourcePt: s,
      currentPt: c,
    }: {
      sourceHandleId: string
      sourceNodeId: string
      sourcePt: { x: number; y: number }
      currentPt: { x: number; y: number }
    }) => setDraft({ sx: s.x, sy: s.y, cx: c.x, cy: c.y })
    const clear = () => setDraft(null)
    engine.on('draftEdgeMove', onMove)
    engine.on('edgeCreateCancelled', clear)
    engine.on('edgeCreated', clear)
    return () => {
      engine.off('draftEdgeMove', onMove)
      engine.off('edgeCreateCancelled', clear)
      engine.off('edgeCreated', clear)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      {edges.map((e: Edge) => (
        <path
          key={e.id}
          d={bezierPath(e.source.pt, e.target.pt)}
          fill="none"
          stroke={T.edge}
          strokeWidth={1.5}
        />
      ))}
      {draft && (
        <path
          d={bezierPath({ x: draft.sx, y: draft.sy }, { x: draft.cx, y: draft.cy })}
          fill="none"
          stroke={T.accent}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      )}
    </svg>
  )
}

/** Full-size canvas container with a dot-grid background that applies the engine's viewport transform to its children. */
export function WorldCanvas({
  canvasRef,
  children,
}: {
  /** Callback ref returned by `useFlowCanvas` — must be attached to this element. */
  canvasRef: (el: HTMLElement | null) => void
  /** Node elements and EdgeLayer to render inside the transformed layer. */
  children: ReactNode
}) {
  const { getEngine } = useFlowContext()
  const [tx, setTx] = useState({ scale: 1, translateX: 0, translateY: 0 })

  useEffect(() => {
    const engine = getEngine()
    const sync = () => setTx({ ...engine.getViewport() })
    sync()
    engine.on('viewportChanged', sync)
    return () => engine.off('viewportChanged', sync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: T.bg,
        backgroundImage: `radial-gradient(circle, ${T.dot} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '0 0',
          transform: `translate(${tx.translateX}px, ${tx.translateY}px) scale(${tx.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export const btn: CSSProperties = {
  padding: '5px 14px',
  borderRadius: 6,
  border: `1px solid #444`,
  background: '#1e1e1e',
  color: T.text,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'ui-monospace, monospace',
}

export const toolbar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  background: '#111',
  borderBottom: `1px solid ${T.border}`,
  flexShrink: 0,
}
