import { useEffect, useState } from 'react'
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
import { bezierPath } from './bezier'

// ── Node component ────────────────────────────────────────────────────────────

interface FlowNodeProps {
  id: string
  label: string
  defaultPosition: { x: number; y: number }
}

function FlowNode({ id, label, defaultPosition }: FlowNodeProps) {
  const nodeRef = useNode(id, { defaultPosition })
  const outputRef = useHandle(id, 'output', 'source')
  const inputRef = useHandle(id, 'input', 'target')
  const selected = useSelection()

  const isSelected = selected.has(id)

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 160,
        background: isSelected ? '#1e1b4b' : '#1c1c1c',
        border: `1.5px solid ${isSelected ? '#6366f1' : '#333'}`,
        borderRadius: 10,
        padding: '10px 14px',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: isSelected ? '0 0 0 2px #6366f144' : '0 2px 8px #0006',
        transition: 'border-color 0.1s, background 0.1s',
      }}
    >
      {/* Input handle */}
      <div
        ref={inputRef}
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
          background: '#6366f1',
          border: '2px solid #0f0f0f',
          cursor: 'crosshair',
        }}
      />

      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>

      {/* Output handle */}
      <div
        ref={outputRef}
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
          background: '#10b981',
          border: '2px solid #0f0f0f',
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
          <polygon points="0 0, 8 3, 0 6" fill="#4f4f4f" />
        </marker>
      </defs>

      {edges.map((edge: Edge) => (
        <path
          key={edge.id}
          d={bezierPath(edge.source.pt, edge.target.pt)}
          fill="none"
          stroke="#4f4f4f"
          strokeWidth={2}
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

  const x = lasso.w < 0 ? lasso.x + lasso.w : lasso.x
  const y = lasso.h < 0 ? lasso.y + lasso.h : lasso.y
  const w = Math.abs(lasso.w)
  const h = Math.abs(lasso.h)

  if (w < 4 && h < 4) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        border: '1.5px dashed #6366f1',
        background: 'rgba(99,102,241,0.07)',
        pointerEvents: 'none',
        borderRadius: 3,
      }}
    />
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

const NODES = [
  { id: 'n1', label: 'Input Source', x: 60, y: 100 },
  { id: 'n2', label: 'Transform A', x: 280, y: 60 },
  { id: 'n3', label: 'Transform B', x: 280, y: 180 },
  { id: 'n4', label: 'Output Sink', x: 500, y: 120 },
]

function Canvas({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  return (
    <div
      ref={canvasRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'radial-gradient(#1a1a2e 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {NODES.map((n) => (
        <FlowNode
          key={n.id}
          id={n.id}
          label={n.label}
          defaultPosition={{ x: n.x, y: n.y }}
        />
      ))}
      <EdgeLayer />
      <LassoOverlay />
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ allowSelfLoop: false })

  return (
    <FlowProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <header
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #222',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <strong style={{ letterSpacing: '0.05em' }}>HeadFlow</strong>
          <span style={{ color: '#555', fontSize: 13 }}>React Demo</span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: '#444',
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
