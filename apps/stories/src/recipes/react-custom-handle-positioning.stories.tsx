import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useFlowContext, useHandle, useNode, useSelection, useViewport } from '@headflow/react'
import { FlowCanvas, EdgeLayer } from '@headflow/react-ui'
import { T, btn, toolbar } from './shared'

const handleDot = (color: string, side: 'left' | 'right' | 'top' | 'bottom'): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute', width: 14, height: 14,
    borderRadius: '50%', background: color, border: `2px solid ${T.bg}`, cursor: 'crosshair',
  }
  if (side === 'left')   return { ...base, left: -7,   top: '50%',  transform: 'translateY(-50%)' }
  if (side === 'right')  return { ...base, right: -7,  top: '50%',  transform: 'translateY(-50%)' }
  if (side === 'top')    return { ...base, top: -7,    left: '50%', transform: 'translateX(-50%)' }
  return                        { ...base, bottom: -7, left: '50%', transform: 'translateX(-50%)' }
}

function ProcessorNode({ id, defaultPosition }: { id: string; defaultPosition: { x: number; y: number } }) {
  const nodeRef = useNode(id, { defaultPosition })
  const aRef    = useHandle(id, 'a',      'target')
  const bRef    = useHandle(id, 'b',      'target')
  const cRef    = useHandle(id, 'c',      'target')
  const outRef  = useHandle(id, 'result', 'source')
  const selected = useSelection().has(id)

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 190, height: 110,
      background: selected ? '#1a1836' : T.surface,
      border: `1.5px solid ${selected ? T.accent : T.border}`,
      borderTop: `4px solid ${T.accent}`,
      borderRadius: 8, cursor: 'grab', userSelect: 'none',
      color: T.text, fontFamily: 'ui-monospace, monospace',
    }}>
      <div style={{ padding: '6px 14px', fontSize: 11, color: T.muted, borderBottom: `1px solid ${T.border}` }}>fn: process()</div>
      <div ref={aRef} data-flow-handle="target" data-flow-handle-id="a" style={{ ...handleDot('#a855f7', 'left'), top: '35%' }} />
      <div style={{ position: 'absolute', left: 18, top: '35%', transform: 'translateY(-50%)', fontSize: 11, color: '#a855f7', fontFamily: 'ui-monospace, monospace' }}>A</div>
      <div ref={bRef} data-flow-handle="target" data-flow-handle-id="b" style={{ ...handleDot('#3b82f6', 'left'), top: '58%' }} />
      <div style={{ position: 'absolute', left: 18, top: '58%', transform: 'translateY(-50%)', fontSize: 11, color: '#3b82f6', fontFamily: 'ui-monospace, monospace' }}>B</div>
      <div ref={cRef} data-flow-handle="target" data-flow-handle-id="c" style={{ ...handleDot('#10b981', 'left'), top: '80%' }} />
      <div style={{ position: 'absolute', left: 18, top: '80%', transform: 'translateY(-50%)', fontSize: 11, color: '#10b981', fontFamily: 'ui-monospace, monospace' }}>C</div>
      <div ref={outRef} data-flow-handle="source" data-flow-handle-id="result" style={handleDot('#f59e0b', 'right')} />
      <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#f59e0b', fontFamily: 'ui-monospace, monospace' }}>out</div>
    </div>
  )
}

function TriggerNode({ id, defaultPosition }: { id: string; defaultPosition: { x: number; y: number } }) {
  const nodeRef  = useNode(id, { defaultPosition })
  const trigRef  = useHandle(id, 'trigger', 'target')
  const passRef  = useHandle(id, 'pass',    'source')
  const selected = useSelection().has(id)

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 130, height: 80,
      background: selected ? '#1a1836' : T.surface,
      border: `1.5px solid ${selected ? T.accent : T.border}`,
      borderTop: `4px solid #ec4899`,
      borderRadius: 8, cursor: 'grab', userSelect: 'none',
      color: T.text, fontSize: 12, fontFamily: 'ui-monospace, monospace',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    }}>
      <div ref={trigRef} data-flow-handle="target" data-flow-handle-id="trigger" style={handleDot('#ec4899', 'top')} />
      <div style={{ fontSize: 9, color: '#ec4899', letterSpacing: 1, textTransform: 'uppercase' }}>trigger</div>
      <div>Gate</div>
      <div style={{ fontSize: 9, color: T.muted, letterSpacing: 1, textTransform: 'uppercase' }}>pass-through</div>
      <div ref={passRef} data-flow-handle="source" data-flow-handle-id="pass" style={handleDot('#f59e0b', 'bottom')} />
    </div>
  )
}

function CornerNode({ id, defaultPosition }: { id: string; defaultPosition: { x: number; y: number } }) {
  const nodeRef  = useNode(id, { defaultPosition })
  const tlRef    = useHandle(id, 'tl', 'target')
  const trRef    = useHandle(id, 'tr', 'target')
  const brRef    = useHandle(id, 'br', 'source')
  const selected = useSelection().has(id)

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 120, height: 80,
      background: selected ? '#1a1836' : T.surface,
      border: `1.5px solid ${selected ? T.accent : T.border}`,
      borderTop: `4px solid #f97316`,
      borderRadius: 8, cursor: 'grab', userSelect: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: T.text, fontSize: 12, fontFamily: 'ui-monospace, monospace',
    }}>
      <div ref={tlRef} data-flow-handle="target" data-flow-handle-id="tl"
        style={{ position: 'absolute', left: -7, top: -7, width: 14, height: 14, borderRadius: '50%', background: '#a855f7', border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      <div ref={trRef} data-flow-handle="target" data-flow-handle-id="tr"
        style={{ position: 'absolute', right: -7, top: -7, width: 14, height: 14, borderRadius: '50%', background: '#3b82f6', border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      <div ref={brRef} data-flow-handle="source" data-flow-handle-id="br"
        style={{ position: 'absolute', right: -7, bottom: -7, width: 14, height: 14, borderRadius: '50%', background: '#f59e0b', border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      Merge
    </div>
  )
}

const ALL_NODES = [
  { id: 'proc', Component: ProcessorNode, x: 220, y: 80  },
  { id: 'gate', Component: TriggerNode,   x: 220, y: 260 },
  { id: 'mrg',  Component: CornerNode,    x: 510, y: 160 },
]

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()
  const { scale } = useViewport()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <button type="button" style={btn} onClick={() => getEngine().fitView({ padding: 60 })}>Fit View</button>
        <span style={{ fontSize: 11, color: T.muted }}>
          zoom {(scale * 100).toFixed(0)}% · Handles at corners, top, bottom, and non-50% positions — all route correctly
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <FlowCanvas canvasRef={canvasRef}>
          {ALL_NODES.map(({ id, Component, x, y }) => (
            <Component key={id} id={id} defaultPosition={{ x, y }} />
          ))}
          <EdgeLayer />
        </FlowCanvas>
      </div>
    </div>
  )
}

function CustomHandlePositioningStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Custom Handle Positioning',
  component: CustomHandlePositioningStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Handles are just DOM elements — place them anywhere: corners, top/bottom edges, or at non-center percentages.',
          '',
          '**APIs used**: `useHandle(nodeId, handleId, type)` with custom `position: absolute` CSS · `useViewport()` for live zoom readout · `engine.fitView()`',
          '',
          '**Try this**: 1) Connect ProcessorNode A/B/C inputs at 35%, 58%, 80% height. 2) Connect TriggerNode top-handle and bottom-handle. 3) Click Fit View, then zoom in/out — handles still connect accurately.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof CustomHandlePositioningStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Three node types each expose handles outside the usual left/right center; Fit View and pan/zoom keep routing accurate.
 * @summary non-standard handle positions remain correct after fitView and viewport changes
 */
export const Default: Story = {}
