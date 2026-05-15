import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useHandle, useNode, useSelection } from '@headflow/react'
import { FlowCanvas, EdgeLayer } from '@headflow/react-ui'
import { SimpleNode, T, toolbar } from './shared'

const dot = (color: string): React.CSSProperties => ({
  position: 'absolute',
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: color,
  border: `2px solid ${T.bg}`,
  cursor: 'crosshair',
})

function SectionedNode({
  id,
  title,
  body,
  status,
  defaultPosition,
}: {
  id: string
  title: string
  body: string
  status: string
  defaultPosition: { x: number; y: number }
}) {
  const nodeRef = useNode(id, { defaultPosition })
  const triggerRef = useHandle(id, 'trigger', 'target')
  const processRef = useHandle(id, 'process', 'source')
  const doneRef = useHandle(id, 'done', 'source')
  const selected = useSelection().has(id)

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 190,
        background: selected ? '#1a1836' : T.surface,
        border: `1.5px solid ${selected ? T.accent : T.border}`,
        borderRadius: 8,
        cursor: 'grab',
        userSelect: 'none',
        color: T.text,
        fontFamily: 'ui-monospace, monospace',
        overflow: 'visible',
      }}
    >
      {/* HEADER — handle at depth 1 */}
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.border}`, position: 'relative' }}>
        <div
          ref={triggerRef}
          data-flow-handle="target"
          data-flow-handle-id="trigger"
          style={{ ...dot('#a855f7'), left: -7, top: '50%', transform: 'translateY(-50%)' }}
        />
        <div style={{ fontSize: 9, color: '#a855f7', letterSpacing: 1, marginBottom: 2 }}>TRIGGER ↓</div>
        <div style={{ fontSize: 13 }}>{title}</div>
      </div>

      {/* BODY — handle nested 2 levels inside */}
      <div style={{ padding: '8px 14px', position: 'relative' }}>
        <div style={{ background: '#1c1c1c', borderRadius: 4, padding: '6px 8px', position: 'relative' }}>
          <div style={{ fontSize: 11, color: T.muted }}>{body}</div>
          <div
            ref={processRef}
            data-flow-handle="source"
            data-flow-handle-id="process"
            style={{ ...dot('#3b82f6'), right: -21, top: '50%', transform: 'translateY(-50%)' }}
          />
        </div>
        <div style={{ fontSize: 9, color: '#3b82f6', textAlign: 'right', marginTop: 4, letterSpacing: 1 }}>
          → PROCESS
        </div>
      </div>

      {/* FOOTER — handle at depth 1 */}
      <div
        style={{
          padding: '6px 14px',
          borderTop: `1px solid ${T.border}`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 11, color: T.green }}>● {status}</div>
        <div style={{ fontSize: 9, color: T.green, letterSpacing: 1 }}>DONE →</div>
        <div
          ref={doneRef}
          data-flow-handle="source"
          data-flow-handle-id="done"
          style={{ ...dot(T.green), right: -7, top: '50%', transform: 'translateY(-50%)' }}
        />
      </div>
    </div>
  )
}

const CARDS = [
  { id: 'c1', title: 'Validate Input', body: 'Schema check + sanitize', status: 'Ready', x: 60, y: 80 },
  { id: 'c2', title: 'Enrich Data', body: 'Lookup + join fields', status: 'Ready', x: 320, y: 80 },
  { id: 'c3', title: 'Emit Result', body: 'Serialize + publish event', status: 'Idle', x: 580, y: 80 },
]

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <span style={{ fontSize: 11, color: T.muted }}>
          Handles live in header, inside a nested body wrapper, and in the footer — depth doesn't matter
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <FlowCanvas canvasRef={canvasRef}>
          {CARDS.map((c) => (
            <SectionedNode
              key={c.id}
              id={c.id}
              title={c.title}
              body={c.body}
              status={c.status}
              defaultPosition={{ x: c.x, y: c.y }}
            />
          ))}
          <SimpleNode id="sink1" label="Logger" kind="output" defaultPosition={{ x: 140, y: 340 }} />
          <SimpleNode id="sink2" label="Storage" kind="output" defaultPosition={{ x: 380, y: 340 }} />
          <SimpleNode id="sink3" label="Notifier" kind="output" defaultPosition={{ x: 620, y: 340 }} />
          <EdgeLayer />
        </FlowCanvas>
      </div>
    </div>
  )
}

function NestedNodeHandlesStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Nested Node Handles',
  component: NestedNodeHandlesStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Each handle is just a DOM element registered via `useHandle`. It can live at any depth inside a node — a direct child, inside a section, or several wrappers deep.',
          '',
          '**APIs used**: `useHandle(nodeId, handleId, type)` at three different DOM depths within one node · `useNode`',
          '',
          '**Try this**: 1) Drag from a purple TRIGGER handle (header). 2) Drag from the blue PROCESS handle (nested in body). 3) Connect the green DONE handle (footer) and verify all three route correctly after panning/zooming.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof NestedNodeHandlesStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Three SectionedNodes expose trigger (header), process (nested body), and done (footer) handles — all connect correctly.
 * @summary nested handles at three DOM depths all produce accurate edge routing
 */
export const Default: Story = {}
