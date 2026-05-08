import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useEdges, useFlowCanvas, useFlowContext, useHandle, useNode, useSelection } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { bezierPath } from '@headflow/renderer'
import { WorldCanvas, T, toolbar } from './shared'

const TYPE_COLOR = { event: '#a855f7', data: '#3b82f6' } as const
type PortType = keyof typeof TYPE_COLOR

// Maps 'nodeId:handleId' → declared port type
const PORT_TYPES: Record<string, PortType> = {
  'emitter:emit':        'event',
  'datafeed:out':        'data',
  'processor:trigger':   'event',
  'processor:data-in':   'data',
  'processor:result':    'data',
  'sink:data-in':        'data',
  'sink:log-in':         'data',
}

function TypedEdgeLayer() {
  const { getEngine } = useFlowContext()
  const edges = useEdges()
  const [draft, setDraft] = useState<{ sx: number; sy: number; cx: number; cy: number } | null>(null)

  useEffect(() => {
    const engine = getEngine()
    const onMove = ({ sourcePt: s, currentPt: c }: { sourceHandleId: string; sourceNodeId: string; sourcePt: { x: number; y: number }; currentPt: { x: number; y: number } }) =>
      setDraft({ sx: s.x, sy: s.y, cx: c.x, cy: c.y })
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
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {edges.map((e: Edge) => {
        const pt = PORT_TYPES[`${e.source.nodeId}:${e.source.handleId}`]
        const color = pt ? TYPE_COLOR[pt] : '#818cf8'
        return <path key={e.id} d={bezierPath(e.source.pt, e.target.pt)} fill="none" stroke={color} strokeWidth={1.5} />
      })}
      {draft && (
        <path d={bezierPath({ x: draft.sx, y: draft.sy }, { x: draft.cx, y: draft.cy })}
          fill="none" stroke={T.accent} strokeWidth={1.5} strokeDasharray="5 4" />
      )}
    </svg>
  )
}

// Single-port source node
function SourceNode({ id, label, portId, portType, defaultPosition }: {
  id: string; label: string; portId: string; portType: PortType
  defaultPosition: { x: number; y: number }
}) {
  const nodeRef = useNode(id, { defaultPosition })
  const outRef = useHandle(id, portId, 'source')
  const selected = useSelection().has(id)
  const color = TYPE_COLOR[portType]

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 130,
      background: selected ? '#1a1836' : T.surface,
      border: `1.5px solid ${selected ? T.accent : T.border}`,
      borderTop: `4px solid ${color}`,
      borderRadius: 8, padding: '8px 12px',
      cursor: 'grab', userSelect: 'none', color: T.text, fontFamily: 'ui-monospace, monospace',
    }}>
      <div style={{ fontSize: 9, color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>{portType}</div>
      <div style={{ fontSize: 12 }}>{label}</div>
      <div ref={outRef} data-flow-handle="source" data-flow-handle-id={portId}
        style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: color,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
    </div>
  )
}

// Processor: event trigger (left-top) + data input (left-bottom) → data result (right)
function ProcessorNode({ defaultPosition }: { defaultPosition: { x: number; y: number } }) {
  const ID = 'processor'
  const nodeRef = useNode(ID, { defaultPosition })
  const trigRef   = useHandle(ID, 'trigger', 'target')
  const dataInRef = useHandle(ID, 'data-in', 'target')
  const resultRef = useHandle(ID, 'result',  'source')
  const selected = useSelection().has(ID)

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 180, height: 120,
      background: selected ? '#1a1836' : T.surface,
      border: `1.5px solid ${selected ? T.accent : T.border}`,
      borderRadius: 8, cursor: 'grab', userSelect: 'none',
      color: T.text, fontFamily: 'ui-monospace, monospace',
    }}>
      <div style={{ padding: '7px 14px', borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>
        Processor
      </div>

      {/* trigger — event */}
      <div ref={trigRef} data-flow-handle="target" data-flow-handle-id="trigger"
        style={{ position: 'absolute', left: -7, top: '38%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: TYPE_COLOR.event,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      <div style={{ position: 'absolute', left: 14, top: '38%', transform: 'translateY(-50%)', fontSize: 10, color: TYPE_COLOR.event }}>
        trigger
      </div>

      {/* data-in — data */}
      <div ref={dataInRef} data-flow-handle="target" data-flow-handle-id="data-in"
        style={{ position: 'absolute', left: -7, top: '72%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: TYPE_COLOR.data,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      <div style={{ position: 'absolute', left: 14, top: '72%', transform: 'translateY(-50%)', fontSize: 10, color: TYPE_COLOR.data }}>
        data-in
      </div>

      {/* result — data (source) */}
      <div ref={resultRef} data-flow-handle="source" data-flow-handle-id="result"
        style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: TYPE_COLOR.data,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: TYPE_COLOR.data }}>
        result
      </div>
    </div>
  )
}

// Sink: two data target handles
function SinkNode({ defaultPosition }: { defaultPosition: { x: number; y: number } }) {
  const ID = 'sink'
  const nodeRef = useNode(ID, { defaultPosition })
  const dataRef = useHandle(ID, 'data-in', 'target')
  const logRef  = useHandle(ID, 'log-in',  'target')
  const selected = useSelection().has(ID)

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 140, height: 100,
      background: selected ? '#1a1836' : T.surface,
      border: `1.5px solid ${selected ? T.accent : T.border}`,
      borderTop: `4px solid ${T.amber}`,
      borderRadius: 8, cursor: 'grab', userSelect: 'none',
      color: T.text, fontFamily: 'ui-monospace, monospace',
    }}>
      <div style={{ padding: '7px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>Sink</div>

      <div ref={dataRef} data-flow-handle="target" data-flow-handle-id="data-in"
        style={{ position: 'absolute', left: -7, top: '42%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: TYPE_COLOR.data,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      <div style={{ position: 'absolute', left: 14, top: '42%', transform: 'translateY(-50%)', fontSize: 10, color: TYPE_COLOR.data }}>
        data-in
      </div>

      <div ref={logRef} data-flow-handle="target" data-flow-handle-id="log-in"
        style={{ position: 'absolute', left: -7, top: '76%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: TYPE_COLOR.data,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      <div style={{ position: 'absolute', left: 14, top: '76%', transform: 'translateY(-50%)', fontSize: 10, color: TYPE_COLOR.data }}>
        log-in
      </div>
    </div>
  )
}

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
      const srcType = PORT_TYPES[`${edge.source.nodeId}:${edge.source.handleId}`]
      const tgtType = PORT_TYPES[`${edge.target.nodeId}:${edge.target.handleId}`]
      if (srcType && tgtType && srcType !== tgtType) {
        engine.removeEdge(edge.id)
        flash(`Type mismatch: ${srcType} port cannot connect to ${tgtType} port`)
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
          <span style={{ color: TYPE_COLOR.event }}>■</span> Event &nbsp;
          <span style={{ color: TYPE_COLOR.data }}>■</span> Data &nbsp;—&nbsp;
          each handle declares a type; cross-type connections are blocked at the port level
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <WorldCanvas canvasRef={canvasRef}>
          <SourceNode id="emitter"  label="Event Emitter" portId="emit" portType="event" defaultPosition={{ x: 40, y: 70 }} />
          <SourceNode id="datafeed" label="Data Feed"     portId="out"  portType="data"  defaultPosition={{ x: 40, y: 230 }} />
          <ProcessorNode defaultPosition={{ x: 270, y: 110 }} />
          <SinkNode      defaultPosition={{ x: 540, y: 145 }} />
          <TypedEdgeLayer />
        </WorldCanvas>
        {toast && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: '#7f1d1d', color: '#fca5a5', padding: '8px 18px', borderRadius: 6,
            fontSize: 12, fontFamily: 'ui-monospace, monospace', border: '1px solid #991b1b',
            pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Each handle declares a port type (event or data). Connections between mismatched types are blocked.
 * This is more granular than node-level typing — different handles on the same node can have different types.
 * @summary handle-level port typing; cross-type connections removed with a toast explanation
 */
function TypeSafePortsStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Type Safe Ports',
  component: TypeSafePortsStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Unlike node-level typing (whole node is one type), port-level typing lets a single node accept an event trigger AND a data input — each port is independently typed, like a function signature.',
          '',
          '**APIs used**: `engine.on("edgeCreated")` + `engine.removeEdge(id)` · A `PORT_TYPES` lookup map keyed by `"nodeId:handleId"` · Custom edge layer colors edges by source port type',
          '',
          '**Try this**: 1) Connect Event Emitter → Processor trigger (purple→purple) — succeeds. 2) Try Event Emitter → Processor data-in (purple→blue) — blocked with a type-mismatch toast. 3) Connect Data Feed → Processor data-in, then Processor result → Sink.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof TypeSafePortsStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Emitter→trigger and DataFeed→data-in succeed; Emitter→data-in is blocked.
 * @summary valid and invalid cross-type port connections demonstrated side by side
 */
export const Default: Story = {}
