import { useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useFlowContext, useSelection } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { FlowCanvas, EdgeLayer, EdgeLabels } from '@headflow/react-ui'
import { SimpleNode, T, toolbar } from './shared'

const NODES = [
  { id: 'n1', label: 'Login Form', kind: 'input' as const, x: 40, y: 130 },
  { id: 'n2', label: 'Confirm Dialog', kind: 'default' as const, x: 300, y: 130 },
  { id: 'n3', label: 'Submit', kind: 'output' as const, x: 560, y: 130 },
]
const NODE_IDS = new Set(NODES.map((n) => n.id))

const EDGES = [
  { id: 'e1', source: { nodeId: 'n1', handleId: 'output' }, target: { nodeId: 'n2', handleId: 'input' } },
  { id: 'e2', source: { nodeId: 'n2', handleId: 'output' }, target: { nodeId: 'n3', handleId: 'input' } },
]

// App-owned data, keyed by edge id — HeadFlow's core never sees this.
const MOVE_META: Record<string, { keys: string; delayMs: number }> = {
  e1: { keys: 'Tab ↵', delayMs: 300 },
  e2: { keys: '⌘ Enter', delayMs: 150 },
}

function SelectionStatus() {
  const selected = useSelection()
  const ids = [...selected]

  return (
    <span style={{ fontSize: 11, color: ids.length ? T.amber : T.muted }}>
      {ids.length === 0
        ? 'Nothing selected'
        : `Selected (${ids.length}): ${ids
            .map((id) => (NODE_IDS.has(id) ? `node:${id}` : `edge:${id}`))
            .join(', ')}`}
    </span>
  )
}

function MoveLabel({ edge }: { edge: Edge }) {
  const { getEngine } = useFlowContext()
  const meta = MOVE_META[edge.id]
  if (!meta) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: 999,
        background: '#1e1e1e',
        border: `1px solid ${T.border}`,
        fontSize: 10,
        fontFamily: 'ui-monospace, monospace',
        color: T.text,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      <span>{meta.keys} · {meta.delayMs}ms</span>
      <button
        type="button"
        title="Delete this move"
        // Selection is decided at pointerdown, so stopping propagation only
        // on click is too late — the edge would already be selected by then.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => getEngine().removeEdge(edge.id)}
        style={{
          border: 'none',
          background: 'transparent',
          color: T.muted,
          cursor: 'pointer',
          fontSize: 11,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()

  useEffect(() => {
    getEngine().restore({
      nodes: NODES.map((n) => ({ id: n.id, position: { x: n.x, y: n.y } })),
      edges: EDGES,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <span style={{ fontSize: 11, color: T.muted }}>
          Click a move's pill to select its edge · Shift-click to add/toggle · Click ✕ to delete without selecting
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <SelectionStatus />
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <FlowCanvas canvasRef={canvasRef}>
          {NODES.map((n) => (
            <SimpleNode
              key={n.id} id={n.id} label={n.label} kind={n.kind}
              defaultPosition={{ x: n.x, y: n.y }}
            />
          ))}
          <EdgeLayer />
          <EdgeLabels renderLabel={(edge) => <MoveLabel edge={edge} />} />
        </FlowCanvas>
      </div>
    </div>
  )
}

function EdgeLabelsStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({})
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Edge Labels',
  component: EdgeLabelsStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          "**Why this scenario**: An edge often carries data an app cares about — here, which keystroke fires a transition and how long it waits. `EdgeLabels` lets you render that as arbitrary content (not just a string) positioned at the edge's midpoint, because HeadFlow's core has no concept of a node's or edge's app data — it only owns topology (see `useNodeRemoval`'s equivalent contract for nodes).",
          '',
          '**APIs used**: `<EdgeLabels renderLabel={(edge) => ReactNode} />` — returning `null` skips an edge entirely (no leftover invisible hit area). The label wrapper carries the same `data-flow-edge` attribute as the edge\'s own hit path, so clicking it reuses the exact same click/shift-toggle selection logic as clicking the line — zero core changes.',
          '',
          "**Try this**: 1) Click a move's pill — its edge gets selected and turns amber, exactly like clicking the line itself. 2) Shift-click a node, then Shift-click a pill — both stay selected; Shift-click either again to toggle it off. 3) Click the **✕** inside a pill — the edge is deleted *without* being selected first. This works because the button calls `e.stopPropagation()` in `onPointerDown`, not `onClick`: HeadFlow decides selection at `pointerdown`, so stopping propagation any later wouldn't prevent it.",
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof EdgeLabelsStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Custom pill content (keystroke + delay) rendered at each edge's midpoint — clicking it selects the edge, clicking its ✕ deletes without selecting.
 * @summary EdgeLabels renderLabel render-prop, plus the pointerdown-vs-click stopPropagation gotcha for interactive label content
 */
export const Default: Story = {}
