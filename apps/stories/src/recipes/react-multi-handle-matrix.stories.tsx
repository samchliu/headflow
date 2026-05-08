import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useEdges, useFlowCanvas, useFlowContext, useHandle, useNode, useSelection } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { bezierPath } from '@headflow/renderer'
import { SimpleNode, WorldCanvas, T, toolbar } from './shared'

// Colors for each named handle
const H_COLOR: Record<string, string> = {
  in1: '#f97316',
  in2: '#14b8a6',
  in3: '#ec4899',
  out1: '#6366f1',
  out2: '#f59e0b',
}

// in2 is single-connection; in1 and in3 accept many
const SINGLE_HANDLES = new Set(['in2'])

// Colored edge layer — edges inherit color from handle ID
function ColoredEdgeLayer() {
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
      {edges.map((e: Edge) => {
        const color =
          H_COLOR[e.source.handleId] ?? H_COLOR[e.target.handleId] ?? '#818cf8'
        return (
          <path
            key={e.id}
            d={bezierPath(e.source.pt, e.target.pt)}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          />
        )
      })}
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

function RouterNode({ defaultPosition }: { defaultPosition: { x: number; y: number } }) {
  const ID = 'router'
  const nodeRef = useNode(ID, { defaultPosition })
  const in1Ref = useHandle(ID, 'in1', 'target')
  const in2Ref = useHandle(ID, 'in2', 'target')
  const in3Ref = useHandle(ID, 'in3', 'target')
  const out1Ref = useHandle(ID, 'out1', 'source')
  const out2Ref = useHandle(ID, 'out2', 'source')
  const selected = useSelection().has(ID)

  const dot = (
    ref: (el: HTMLElement | null) => void,
    id: string,
    side: 'left' | 'right',
    top: string,
    type: 'source' | 'target',
  ) => (
    <div
      ref={ref}
      data-flow-handle={type}
      data-flow-handle-id={id}
      data-flow-handle-multiple={!SINGLE_HANDLES.has(id) ? 'true' : undefined}
      style={{
        position: 'absolute',
        [side]: -8,
        top,
        transform: 'translateY(-50%)',
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: H_COLOR[id] ?? T.accent,
        border: `2px solid ${T.bg}`,
        cursor: 'crosshair',
      }}
    />
  )

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 170,
        height: 150,
        background: selected ? '#1a1836' : T.surface,
        border: `1.5px solid ${selected ? T.accent : T.border}`,
        borderRadius: 8,
        cursor: 'grab',
        userSelect: 'none',
        color: T.text,
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <div
        style={{
          padding: '7px 14px',
          borderBottom: `1px solid ${T.border}`,
          fontSize: 11,
          color: T.muted,
          letterSpacing: 1,
        }}
      >
        ROUTER
      </div>

      {/* Target handles — left side */}
      {dot(in1Ref, 'in1', 'left', '33%', 'target')}
      {dot(in2Ref, 'in2', 'left', '57%', 'target')}
      {dot(in3Ref, 'in3', 'left', '81%', 'target')}

      {/* Labels for inputs */}
      <div style={{ position: 'absolute', left: 14, top: '33%', transform: 'translateY(-50%)', fontSize: 11, color: H_COLOR.in1 }}>
        in1 <span style={{ color: T.muted }}>×∞</span>
      </div>
      <div style={{ position: 'absolute', left: 14, top: '57%', transform: 'translateY(-50%)', fontSize: 11, color: H_COLOR.in2 }}>
        in2 <span style={{ color: T.muted }}>×1</span>
      </div>
      <div style={{ position: 'absolute', left: 14, top: '81%', transform: 'translateY(-50%)', fontSize: 11, color: H_COLOR.in3 }}>
        in3 <span style={{ color: T.muted }}>×∞</span>
      </div>

      {/* Source handles — right side */}
      {dot(out1Ref, 'out1', 'right', '40%', 'source')}
      {dot(out2Ref, 'out2', 'right', '72%', 'source')}

      {/* Labels for outputs */}
      <div style={{ position: 'absolute', right: 14, top: '40%', transform: 'translateY(-50%)', fontSize: 11, color: H_COLOR.out1 }}>
        out1
      </div>
      <div style={{ position: 'absolute', right: 14, top: '72%', transform: 'translateY(-50%)', fontSize: 11, color: H_COLOR.out2 }}>
        out2
      </div>
    </div>
  )
}

const LEFT_NODES = [
  { id: 's1', label: 'Source A', kind: 'input' as const, x: 40,  y: 40  },
  { id: 's2', label: 'Source B', kind: 'input' as const, x: 40,  y: 195 },
  { id: 's3', label: 'Source C', kind: 'input' as const, x: 40,  y: 350 },
]
const RIGHT_NODES = [
  { id: 'k1', label: 'Sink A', kind: 'output' as const, x: 450, y: 100 },
  { id: 'k2', label: 'Sink B', kind: 'output' as const, x: 450, y: 265 },
]

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = (msg: string) => {
    setToast(msg)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    const engine = getEngine()
    const onEdge = ({ edge }: { edge: Edge }) => {
      const { nodeId, handleId } = edge.target
      if (nodeId === 'router' && SINGLE_HANDLES.has(handleId)) {
        const duplicate = engine
          .getEdges()
          .some(e => e.id !== edge.id && e.target.nodeId === nodeId && e.target.handleId === handleId)
        if (duplicate) {
          engine.removeEdge(edge.id)
          flash(`"${handleId}" only accepts 1 connection`)
        }
      }
    }
    engine.on('edgeCreated', onEdge)
    return () => engine.off('edgeCreated', onEdge)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <span style={{ fontSize: 11, color: T.muted }}>
          Router: <span style={{ color: H_COLOR.in1 }}>in1</span> / <span style={{ color: H_COLOR.in3 }}>in3</span> accept multiple ·{' '}
          <span style={{ color: H_COLOR.in2 }}>in2</span> accepts exactly 1 · Try connecting two sources to in2
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <WorldCanvas canvasRef={canvasRef}>
          {LEFT_NODES.map(n => (
            <SimpleNode
              key={n.id}
              id={n.id}
              label={n.label}
              kind={n.kind}
              defaultPosition={{ x: n.x, y: n.y }}
            />
          ))}
          <RouterNode defaultPosition={{ x: 250, y: 130 }} />
          {RIGHT_NODES.map(n => (
            <SimpleNode
              key={n.id}
              id={n.id}
              label={n.label}
              kind={n.kind}
              defaultPosition={{ x: n.x, y: n.y }}
            />
          ))}
          <ColoredEdgeLayer />
        </WorldCanvas>
        {toast && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#7f1d1d',
              color: '#fca5a5',
              padding: '8px 18px',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'ui-monospace, monospace',
              border: '1px solid #991b1b',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * A single Router node exposes 5 named handles (3 target, 2 source) at distinct vertical positions.
 * Per-handle capacity is enforced in application code by counting existing edges in `edgeCreated`.
 * @summary multiple named handles on one node with per-handle capacity enforcement
 */
function MultiHandleMatrixStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Multi Handle Matrix',
  component: MultiHandleMatrixStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Real workflow nodes expose multiple typed ports at different positions. HeadFlow imposes no schema — declare as many handles as you like, each with a unique ID.',
          '',
          '**APIs used**: `useHandle(nodeId, handleId, type)` × 5 handles · `data-flow-handle-multiple` attribute convention · `engine.getEdges()` + `engine.removeEdge(id)` for capacity enforcement',
          '',
          '**Try this**: 1) Connect Source A and Source B both to Router in1 — both succeed (×∞). 2) Connect Source A to in2, then try Source B to in2 — the second is rejected. 3) Route out1 and out2 to different sinks. Notice edges inherit handle colors.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof MultiHandleMatrixStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * in1/in3 accept unlimited connections; in2 rejects a second connection with a toast. Edges are coloured by handle.
 * @summary unlimited-capacity vs single-capacity handles; edges inherit handle color
 */
export const Default: Story = {}
