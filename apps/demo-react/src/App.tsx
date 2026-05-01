import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import {
  useFlowCanvas,
  useNode,
  useHandle,
  useEdges,
  useSelection,
  useLasso,
} from '@headflow/react'
import type { Edge } from '@headflow/react'
import { useFlowContext } from '@headflow/react'
import { bezierPath, normalizeLassoRect } from '@headflow/renderer'

const TOKENS = {
  canvasBg: '#0d0d0d',
  surfaceBg: '#141414',
  headerBg: '#111111',
  borderDefault: '#262626',
  borderAccent: '#6366f1',
  textPrimary: '#f0f0f0',
  textMuted: '#8a8a8a',
  accent: '#6366f1',
  accentAlt: '#10b981',
  edge: '#818cf8',
  dot: '#2a2a2a',
} as const

// ── Node component ────────────────────────────────────────────────────────────

interface FlowNodeProps {
  id: string
  label: string
  kind: 'input' | 'transform' | 'output'
  defaultPosition: { x: number; y: number }
}

function FlowNode({ id, label, kind, defaultPosition }: FlowNodeProps) {
  const nodeRef = useNode(id, { defaultPosition })
  const outputRef = useHandle(id, 'output', 'source')
  const inputRef = useHandle(id, 'input', 'target')
  const selected = useSelection()

  const isSelected = selected.has(id)
  const topAccent = kind === 'input' ? '#10b981' : kind === 'output' ? '#f59e0b' : '#6366f1'

  return (
    <div
      ref={nodeRef}
      role="button"
      aria-label={`${label} node`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 160,
        background: isSelected ? '#1a1836' : TOKENS.surfaceBg,
        border: `1.5px solid ${isSelected ? TOKENS.borderAccent : TOKENS.borderDefault}`,
        borderTop: `4px solid ${topAccent}`,
        borderRadius: 8,
        padding: '10px 14px',
        cursor: 'grab',
        userSelect: 'none',
        color: TOKENS.textPrimary,
        boxShadow: isSelected ? '0 0 0 2px #6366f133' : '0 4px 16px #0008',
        transition: 'border-color 0.12s, background 0.12s, box-shadow 0.12s',
      }}
    >
      {/* Input handle */}
      <div
        ref={inputRef}
        data-flow-handle="target"
        data-flow-handle-id="input"
        aria-label="Input handle"
        style={{
          position: 'absolute',
          left: -7,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: TOKENS.accent,
          border: `2px solid ${TOKENS.canvasBg}`,
          boxShadow: '0 0 0 3px #6366f133',
          cursor: 'crosshair',
        }}
      />

      <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'Geist Mono, ui-monospace, monospace' }}>
        {label}
      </span>

      {/* Output handle */}
      <div
        ref={outputRef}
        data-flow-handle="source"
        data-flow-handle-id="output"
        aria-label="Output handle"
        style={{
          position: 'absolute',
          right: -7,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: TOKENS.accentAlt,
          border: `2px solid ${TOKENS.canvasBg}`,
          boxShadow: '0 0 0 3px #10b98133',
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}

// ── Edge layer ────────────────────────────────────────────────────────────────

interface DraftEdgeState {
  sourceX: number
  sourceY: number
  currentX: number
  currentY: number
}

function EdgeLayer() {
  const { getEngine } = useFlowContext()
  const edges = useEdges()
  const [draft, setDraft] = useState<DraftEdgeState | null>(null)

  useEffect(() => {
    const engine = getEngine()

    const onMove = ({
      sourcePt,
      currentPt,
    }: {
      sourceHandleId: string
      sourceNodeId: string
      sourcePt: { x: number; y: number }
      currentPt: { x: number; y: number }
    }) => {
      setDraft({ sourceX: sourcePt.x, sourceY: sourcePt.y, currentX: currentPt.x, currentY: currentPt.y })
    }
    const onCancel = () => setDraft(null)

    engine.on('draftEdgeMove', onMove)
    engine.on('edgeCreateCancelled', onCancel)
    engine.on('edgeCreated', onCancel)
    return () => {
      engine.off('draftEdgeMove', onMove)
      engine.off('edgeCreateCancelled', onCancel)
      engine.off('edgeCreated', onCancel)
    }
  // getEngine is stable
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
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={TOKENS.edge} />
        </marker>
      </defs>

      {edges.map((edge: Edge) => (
        <path
          key={edge.id}
          d={bezierPath(edge.source.pt, edge.target.pt)}
          fill="none"
          stroke={TOKENS.edge}
          strokeWidth={1.5}
          markerEnd="url(#arrowhead)"
        />
      ))}

      {draft && (
        <path
          d={bezierPath(
            { x: draft.sourceX, y: draft.sourceY },
            { x: draft.currentX, y: draft.currentY },
          )}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
      )}
    </svg>
  )
}

// ── Lasso overlay ─────────────────────────────────────────────────────────────

function LassoOverlay() {
  const lasso = useLasso()
  if (!lasso) return null

  const normalized = normalizeLassoRect(lasso)

  if (normalized.w < 4 && normalized.h < 4) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: normalized.x,
        top: normalized.y,
        width: normalized.w,
        height: normalized.h,
        border: `1.5px dashed ${TOKENS.accent}`,
        background: 'rgba(99,102,241,0.07)',
        pointerEvents: 'none',
        borderRadius: 4,
      }}
    />
  )
}

function Hud() {
  const { getEngine } = useFlowContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [hasViewportApi, setHasViewportApi] = useState(true)

  useEffect(() => {
    const engine = getEngine()
    const hasHistoryApi =
      typeof (engine as { canUndo?: unknown }).canUndo === 'function' &&
      typeof (engine as { canRedo?: unknown }).canRedo === 'function' &&
      typeof (engine as { undo?: unknown }).undo === 'function' &&
      typeof (engine as { redo?: unknown }).redo === 'function'

    const hasViewport =
      typeof (engine as { getViewport?: unknown }).getViewport === 'function' &&
      typeof (engine as { zoomTo?: unknown }).zoomTo === 'function' &&
      typeof (engine as { fitView?: unknown }).fitView === 'function'

    const sync = () => {
      setCanUndo(hasHistoryApi ? engine.canUndo() : false)
      setCanRedo(hasHistoryApi ? engine.canRedo() : false)
      setHasViewportApi(hasViewport)
      setZoom(hasViewport ? engine.getViewport().scale : 1)
    }

    sync()
    engine.on('viewportChanged', sync)
    engine.on('nodeMoved', sync)
    engine.on('edgeCreated', sync)
    engine.on('edgeDeleted', sync)
    engine.on('selectionChanged', sync)

    return () => {
      engine.off('viewportChanged', sync)
      engine.off('nodeMoved', sync)
      engine.off('edgeCreated', sync)
      engine.off('edgeDeleted', sync)
      engine.off('selectionChanged', sync)
    }
  // getEngine is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        left: 20,
        bottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${TOKENS.borderDefault}`,
        background: '#0f0f0fcc',
        backdropFilter: 'blur(8px)',
      }}
    >
      <button
        type="button"
        onClick={() => {
          const current = getEngine() as { undo?: () => void }
          current.undo?.()
        }}
        disabled={!canUndo}
        style={hudButtonStyle}
      >
        ↩
      </button>
      <button
        type="button"
        onClick={() => {
          const current = getEngine() as { redo?: () => void }
          current.redo?.()
        }}
        disabled={!canRedo}
        style={hudButtonStyle}
      >
        ↪
      </button>
      <button
        type="button"
        disabled={!hasViewportApi}
        onClick={() => {
          const current = getEngine() as { fitView?: () => void }
          current.fitView?.()
        }}
        style={hudButtonStyle}
      >
        ⊡
      </button>
      <input
        type="range"
        min={0.1}
        max={2}
        step={0.05}
        value={zoom}
        disabled={!hasViewportApi}
        onChange={(e) => {
          const current = getEngine() as { zoomTo?: (scale: number) => void }
          current.zoomTo?.(Number(e.target.value))
        }}
        aria-label="Zoom"
        style={{ width: 120 }}
      />
      <span style={{ minWidth: 42, fontSize: 12, color: TOKENS.textMuted }}>
        {Math.round(zoom * 100)}%
      </span>
    </div>
  )
}

const hudButtonStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 7,
  border: `1px solid ${TOKENS.borderDefault}`,
  background: TOKENS.surfaceBg,
  color: TOKENS.textPrimary,
  cursor: 'pointer',
}

// ── Canvas ────────────────────────────────────────────────────────────────────

const NODES = [
  { id: 'n1', label: 'Input Source', kind: 'input' as const, x: 60, y: 100 },
  { id: 'n2', label: 'Transform A', kind: 'transform' as const, x: 280, y: 60 },
  { id: 'n3', label: 'Transform B', kind: 'transform' as const, x: 280, y: 180 },
  { id: 'n4', label: 'Output Sink', kind: 'output' as const, x: 500, y: 120 },
]

function Canvas({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  return (
    <div
      ref={canvasRef}
      role="application"
      aria-label="Flow canvas"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: TOKENS.canvasBg,
        backgroundImage: `radial-gradient(circle, ${TOKENS.dot} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {NODES.map((n) => (
        <FlowNode
          key={n.id}
          id={n.id}
          label={n.label}
          kind={n.kind}
          defaultPosition={{ x: n.x, y: n.y }}
        />
      ))}
      <EdgeLayer />
      <LassoOverlay />
      <Hud />
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const { canvasRef, FlowProvider } = useFlowCanvas({
    allowSelfLoop: false,
    enableBuiltinPanZoom: true,
  })
  const titleStyle = useMemo(
    () => ({
      fontWeight: 600,
      fontSize: 15,
      color: TOKENS.textPrimary,
      fontFamily: 'Geist Sans, ui-sans-serif, system-ui, sans-serif',
    }),
    [],
  )

  return (
    <FlowProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <header
          style={{
            padding: '12px 20px',
            background: TOKENS.headerBg,
            borderBottom: `1px solid ${TOKENS.borderDefault}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: TOKENS.accent,
              display: 'inline-block',
            }}
          />
          <strong style={titleStyle}>HeadFlow</strong>
          <span
            style={{
              color: TOKENS.textMuted,
              fontSize: 12,
              border: `1px solid ${TOKENS.borderDefault}`,
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            React Demo
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: '#888',
            }}
          >
            Drag nodes · Connect handles · Shift+drag to lasso select
          </span>
        </header>

        {/* Canvas */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Canvas canvasRef={canvasRef} />
        </main>
      </div>
    </FlowProvider>
  )
}
