import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useEdges, useFlowCanvas, useFlowContext, useHandle, useNode, useSelection } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { FlowCanvas, EdgeLayer } from '@headflow/react-ui'
import { SimpleNode, T, btn, toolbar } from './shared'

const INITIAL_CAPS: Record<string, number> = {
  'reviewer:in': 1,
  'aggregator:in': 3,
}
const INFINITY = 99999

function CapacityNode({ id, label, handleId, currentCount, maxCount, defaultPosition }: {
  id: string; label: string; handleId: string
  currentCount: number; maxCount: number
  defaultPosition: { x: number; y: number }
}) {
  const nodeRef  = useNode(id, { defaultPosition })
  const inRef    = useHandle(id, handleId, 'target')
  const outRef   = useHandle(id, 'out', 'source')
  const selected = useSelection().has(id)
  const full = currentCount >= maxCount
  const capLabel = maxCount >= INFINITY ? '∞' : String(maxCount)

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 170, height: 80,
      background: selected ? '#1a1836' : T.surface,
      border: `1.5px solid ${selected ? T.accent : full ? '#991b1b' : T.border}`,
      borderTop: `4px solid ${full ? '#ef4444' : T.accent}`,
      borderRadius: 8, cursor: 'grab', userSelect: 'none',
      color: T.text, fontFamily: 'ui-monospace, monospace',
    }}>
      <div ref={inRef} data-flow-handle="target" data-flow-handle-id={handleId}
        style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: full ? '#ef4444' : T.accent,
          border: `2px solid ${T.bg}`, cursor: full ? 'not-allowed' : 'crosshair' }}
      />
      <div style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: 11, color: full ? '#fca5a5' : T.muted,
        background: full ? '#7f1d1d' : '#1a1a1a',
        border: `1px solid ${full ? '#991b1b' : '#333'}`,
        padding: '1px 6px', borderRadius: 4, fontFamily: 'ui-monospace, monospace',
      }}>
        {currentCount}/{capLabel}
      </div>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 12, color: T.text }}>
        {label}
      </div>
      <div ref={outRef} data-flow-handle="source" data-flow-handle-id="out"
        style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: T.green, border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
    </div>
  )
}

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()
  const [toast, setToast] = useState<string | null>(null)
  const [caps, setCaps] = useState<Record<string, number>>({ ...INITIAL_CAPS })
  const capsRef = useRef<Record<string, number>>({ ...INITIAL_CAPS })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const edges = useEdges()

  const countFor = (nodeId: string, handleId: string) =>
    edges.filter((e) => e.target.nodeId === nodeId && e.target.handleId === handleId).length

  const flash = (msg: string) => {
    setToast(msg)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    const engine = getEngine()
    const onEdge = ({ edge }: { edge: Edge }) => {
      const key = `${edge.target.nodeId}:${edge.target.handleId}`
      const max = capsRef.current[key]
      if (max === undefined) return
      const existing = engine.getEdges().filter(
        (e) => e.id !== edge.id && e.target.nodeId === edge.target.nodeId && e.target.handleId === edge.target.handleId,
      )
      if (existing.length >= max) {
        engine.removeEdge(edge.id)
        flash(`"${edge.target.handleId}" on ${edge.target.nodeId} is full (max ${max === INFINITY ? '∞' : max})`)
      }
    }
    engine.on('edgeCreated', onEdge)
    return () => engine.off('edgeCreated', onEdge)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setCap = (key: string, max: number) => {
    const engine = getEngine()
    const [nodeId, handleId] = key.split(':')
    if (max < INFINITY) {
      engine.getEdges()
        .filter((e) => e.target.nodeId === nodeId && e.target.handleId === handleId)
        .slice(max)
        .forEach((e) => engine.removeEdge(e.id))
    }
    capsRef.current[key] = max
    setCaps((prev) => ({ ...prev, [key]: max }))
  }

  const capBtn = (key: string, val: number, label: string) => (
    <button
      key={label}
      type="button"
      onClick={() => setCap(key, val)}
      style={{
        ...btn, padding: '3px 8px', fontSize: 11,
        background: caps[key] === val ? T.accent : '#1e1e1e',
        borderColor: caps[key] === val ? T.accent : '#444',
        color: caps[key] === val ? '#fff' : T.muted,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <span style={{ fontSize: 11, color: T.muted }}>Reviewer max:</span>
        {capBtn('reviewer:in', 1, '1')}{capBtn('reviewer:in', 2, '2')}{capBtn('reviewer:in', 3, '3')}
        <span style={{ width: 16 }} />
        <span style={{ fontSize: 11, color: T.muted }}>Aggregator max:</span>
        {capBtn('aggregator:in', 1, '1')}{capBtn('aggregator:in', 3, '3')}{capBtn('aggregator:in', INFINITY, '∞')}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <FlowCanvas canvasRef={canvasRef}>
          <SimpleNode id="task-a" label="Task A" kind="input" defaultPosition={{ x: 40, y: 50  }} />
          <SimpleNode id="task-b" label="Task B" kind="input" defaultPosition={{ x: 40, y: 185 }} />
          <SimpleNode id="task-c" label="Task C" kind="input" defaultPosition={{ x: 40, y: 320 }} />
          <CapacityNode id="reviewer"   label="Reviewer"   handleId="in"
            currentCount={countFor('reviewer',   'in')} maxCount={caps['reviewer:in']   ?? 1}
            defaultPosition={{ x: 270, y: 100 }} />
          <CapacityNode id="aggregator" label="Aggregator" handleId="in"
            currentCount={countFor('aggregator', 'in')} maxCount={caps['aggregator:in'] ?? 3}
            defaultPosition={{ x: 270, y: 295 }} />
          <SimpleNode id="output" label="Output" kind="output" defaultPosition={{ x: 520, y: 200 }} />
          <EdgeLayer />
        </FlowCanvas>
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

function PortCapacityLimitsStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Port Capacity Limits',
  component: PortCapacityLimitsStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Many workflows need limits on how many connections a port accepts. Capacity is just a number in application state — you can change it live.',
          '',
          '**APIs used**: `useEdges()` to reactively derive per-handle edge count · `engine.getEdges()` + `engine.removeEdge()` for enforcement and cleanup',
          '',
          '**Try this**: 1) Connect Task A and Task B to Reviewer — the second is rejected (max 1). 2) Click "2" to raise the limit. 3) Lower Aggregator to max 1 — two edges are removed automatically.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof PortCapacityLimitsStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Reviewer starts at max 1; Aggregator at max 3. Change limits live and watch badges and enforcement update.
 * @summary capacity badge turns red when full; lowering the limit removes excess edges immediately
 */
export const Default: Story = {}
