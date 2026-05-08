import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useHandle, useNode, useSelection } from '@headflow/react'
import { EdgeLayer, SimpleNode, WorldCanvas, T, toolbar } from './shared'

// Shared style for all handle dots
const dot = (color: string): React.CSSProperties => ({
  position: 'absolute',
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: color,
  border: `2px solid ${T.bg}`,
  cursor: 'crosshair',
})

// SectionedNode: header / body / footer — each section owns a handle at an arbitrary DOM depth
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

  // Handle in the HEADER section (1 level deep)
  const triggerRef = useHandle(id, 'trigger', 'target')

  // Handle in the BODY section — nested 2 levels inside body > inner wrapper
  const processRef = useHandle(id, 'process', 'source')

  // Handle in the FOOTER section (1 level deep)
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
      {/* ── HEADER SECTION ── handle sits here as a direct child */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: `1px solid ${T.border}`,
          position: 'relative',
        }}
      >
        <div
          ref={triggerRef}
          data-flow-handle="target"
          data-flow-handle-id="trigger"
          style={{ ...dot('#a855f7'), left: -7, top: '50%', transform: 'translateY(-50%)' }}
        />
        <div style={{ fontSize: 9, color: '#a855f7', letterSpacing: 1, marginBottom: 2 }}>
          TRIGGER ↓
        </div>
        <div style={{ fontSize: 13 }}>{title}</div>
      </div>

      {/* ── BODY SECTION ── handle is nested inside body > inner div > wrapper */}
      <div style={{ padding: '8px 14px', position: 'relative' }}>
        {/* Nested wrapper — the handle is a grandchild of the node root */}
        <div style={{ background: '#1c1c1c', borderRadius: 4, padding: '6px 8px', position: 'relative' }}>
          <div style={{ fontSize: 11, color: T.muted }}>{body}</div>
          {/* Handle at DOM depth 3 (node > body > inner > handle) */}
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

      {/* ── FOOTER SECTION ── handle sits here as a direct child */}
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
  { id: 'c1', title: 'Validate Input', body: 'Schema check + sanitize',     status: 'Ready',  x: 60,  y: 80  },
  { id: 'c2', title: 'Enrich Data',    body: 'Lookup + join fields',         status: 'Ready',  x: 320, y: 80  },
  { id: 'c3', title: 'Emit Result',    body: 'Serialize + publish event',    status: 'Idle',   x: 580, y: 80  },
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
        <WorldCanvas canvasRef={canvasRef}>
          {CARDS.map(c => (
            <SectionedNode
              key={c.id}
              id={c.id}
              title={c.title}
              body={c.body}
              status={c.status}
              defaultPosition={{ x: c.x, y: c.y }}
            />
          ))}
          {/* Simple sink nodes below the cards to connect to */}
          <SimpleNode id="sink1" label="Logger"   kind="output" defaultPosition={{ x: 140, y: 340 }} />
          <SimpleNode id="sink2" label="Storage"  kind="output" defaultPosition={{ x: 380, y: 340 }} />
          <SimpleNode id="sink3" label="Notifier" kind="output" defaultPosition={{ x: 620, y: 340 }} />
          <EdgeLayer />
        </WorldCanvas>
      </div>
    </div>
  )
}

/**
 * Proves that `useHandle` works at any DOM depth inside a node.
 * Each card registers handles in its header (depth 1), inside a nested body wrapper (depth 3), and in its footer (depth 1).
 * @summary handles at depth 1, 3, and 1 inside one node all route edges correctly
 */
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
          '**Why this scenario**: Each handle is just a DOM element registered via `useHandle`. It can live at any depth inside a node — a direct child, inside a section, or several wrappers deep. The engine reads its position via `getBoundingClientRect`, so nesting depth is irrelevant.',
          '',
          '**APIs used**: `useHandle(nodeId, handleId, type)` at three different DOM depths within one node · `useNode`',
          '',
          '**Try this**: 1) Drag from a purple TRIGGER handle (header) to another card. 2) Drag from the blue PROCESS handle (nested in body) to a sink node. 3) Connect the green DONE handle (footer) and verify all three handle positions route edges correctly after panning/zooming.',
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
