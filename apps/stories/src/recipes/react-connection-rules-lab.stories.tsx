import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useFlowContext, useHandle, useNode, useSelection } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { EdgeLayer, WorldCanvas, T, btn, toolbar } from './shared'

const KIND_COLOR: Record<string, string> = {
  event: '#a855f7',
  data: '#3b82f6',
  control: '#f97316',
}

const NODES = [
  { id: 'e1', label: 'Click',      kind: 'event',   x: 60,  y: 60  },
  { id: 'e2', label: 'Submit',     kind: 'event',   x: 340, y: 60  },
  { id: 'd1', label: 'Fetch',      kind: 'data',    x: 60,  y: 220 },
  { id: 'd2', label: 'Transform',  kind: 'data',    x: 340, y: 220 },
  { id: 'c1', label: 'If Branch',  kind: 'control', x: 60,  y: 380 },
  { id: 'c2', label: 'Loop',       kind: 'control', x: 340, y: 380 },
] as const

const KIND_MAP: Record<string, string> = Object.fromEntries(NODES.map(n => [n.id, n.kind]))

function TypedNode({
  id,
  label,
  kind,
  defaultPosition,
}: {
  id: string
  label: string
  kind: string
  defaultPosition: { x: number; y: number }
}) {
  const nodeRef = useNode(id, { defaultPosition })
  const srcRef = useHandle(id, 'output', 'source')
  const tgtRef = useHandle(id, 'input', 'target')
  const selected = useSelection().has(id)
  const color = KIND_COLOR[kind] ?? T.accent

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 140,
        background: selected ? '#1a1836' : T.surface,
        border: `1.5px solid ${selected ? T.accent : T.border}`,
        borderTop: `4px solid ${color}`,
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
          background: color,
          border: `2px solid ${T.bg}`,
          cursor: 'crosshair',
        }}
      />
      <div
        style={{
          fontSize: 10,
          color,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {kind}
      </div>
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
          background: color,
          border: `2px solid ${T.bg}`,
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}

function Inner({
  canvasRef,
  allowSelf,
  onToggleSelf,
}: {
  canvasRef: (el: HTMLElement | null) => void
  allowSelf: boolean
  onToggleSelf: () => void
}) {
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
      const sk = KIND_MAP[edge.source.nodeId]
      const tk = KIND_MAP[edge.target.nodeId]
      if (sk && tk && sk !== tk) {
        engine.removeEdge(edge.id)
        flash(`Blocked: ${sk} → ${tk}  (same-type only)`)
      }
    }
    engine.on('edgeCreated', onEdge)
    return () => engine.off('edgeCreated', onEdge)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <button
          type="button"
          onClick={onToggleSelf}
          style={{
            ...btn,
            background: allowSelf ? '#14290e' : '#1e1e1e',
            borderColor: allowSelf ? T.green : '#444',
            color: allowSelf ? T.green : T.text,
          }}
        >
          Self-loop: {allowSelf ? 'Allowed' : 'Blocked'}
        </button>
        <span style={{ fontSize: 11, color: T.muted }}>
          Same-type rule active · Try Event → Data to see rejection
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <WorldCanvas canvasRef={canvasRef}>
          {NODES.map(n => (
            <TypedNode
              key={n.id}
              id={n.id}
              label={n.label}
              kind={n.kind}
              defaultPosition={{ x: n.x, y: n.y }}
            />
          ))}
          <EdgeLayer />
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

function Flow({ allowSelf, onToggleSelf }: { allowSelf: boolean; onToggleSelf: () => void }) {
  const { canvasRef, FlowProvider } = useFlowCanvas({ allowSelfLoop: allowSelf, enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} allowSelf={allowSelf} onToggleSelf={onToggleSelf} />
    </FlowProvider>
  )
}

/**
 * Demonstrates how to enforce custom connection rules entirely in application code.
 * Rules live in an `edgeCreated` handler that calls `removeEdge` when validation fails — the core library is untouched.
 * @summary enforce type-matching and self-loop rules via edgeCreated + removeEdge, no core changes
 */
function ConnectionRulesLabStory() {
  const [allowSelf, setAllowSelf] = useState(false)
  const [key, setKey] = useState(0)
  const toggle = () => {
    setAllowSelf(v => !v)
    setKey(k => k + 1)
  }
  return <Flow key={key} allowSelf={allowSelf} onToggleSelf={toggle} />
}

const meta = {
  title: 'Recipes/React/Connection Rules Lab',
  component: ConnectionRulesLabStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: In real workflow builders not every connection is valid. This shows how to enforce custom rules without touching the core library — all policy lives in application code.',
          '',
          '**APIs used**: `useFlowCanvas({ allowSelfLoop })` · `engine.on("edgeCreated")` · `engine.removeEdge(id)`',
          '',
          '**Try this**: 1) Connect two same-type nodes (purple→purple, blue→blue) — succeeds. 2) Try Event→Data — red toast appears and the edge is removed. 3) Toggle "Self-loop: Blocked/Allowed" then drag a handle back to its own node.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ConnectionRulesLabStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Same-type rule blocks Event→Data or Control→Event edges; toggle self-loops to see `allowSelfLoop` take effect.
 * @summary type-mismatch edges are removed with a toast; self-loop policy is toggled live
 */
export const Default: Story = {}
