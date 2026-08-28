import { useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useFlowContext, useSelection } from '@headflow/react'
import { FlowCanvas, EdgeLayer, LassoRect } from '@headflow/react-ui'
import { SimpleNode, T, toolbar } from './shared'

const NODES = [
  { id: 'n1', label: 'Ingest', kind: 'input' as const, x: 40, y: 150 },
  { id: 'n2', label: 'Validate', kind: 'default' as const, x: 280, y: 50 },
  { id: 'n3', label: 'Enrich', kind: 'default' as const, x: 280, y: 250 },
  { id: 'n4', label: 'Publish', kind: 'output' as const, x: 520, y: 150 },
]
const NODE_IDS = new Set(NODES.map((n) => n.id))

const EDGES = [
  { id: 'e1', source: { nodeId: 'n1', handleId: 'output' }, target: { nodeId: 'n2', handleId: 'input' } },
  { id: 'e2', source: { nodeId: 'n1', handleId: 'output' }, target: { nodeId: 'n3', handleId: 'input' } },
  { id: 'e3', source: { nodeId: 'n2', handleId: 'output' }, target: { nodeId: 'n4', handleId: 'input' } },
  { id: 'e4', source: { nodeId: 'n3', handleId: 'output' }, target: { nodeId: 'n4', handleId: 'input' } },
]

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

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()

  // Pre-wire the diamond of edges so there's something to click/lasso immediately.
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
          Click a node/edge · Shift-click to add or toggle · Drag empty space to lasso-select
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
        </FlowCanvas>
        <LassoRect />
      </div>
    </div>
  )
}

function EdgeSelectionStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({})
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Edge Selection',
  component: EdgeSelectionStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Selecting a node has always worked, but connections (edges) are graph objects too — users expect to click a wire to select, inspect, or delete it, just like React Flow.',
          '',
          '**APIs used**: `useSelection()` — one unified `Set<string>` of node **and** edge ids · `<EdgeLayer selectedColor / selectedStrokeWidth / interactionWidth />` for the click target and selected styling · `<LassoRect />` for the drag-select overlay',
          '',
          '**Try this**: 1) Click any edge — it turns amber and thicker, exactly like a selected node gets an accent border. 2) Shift-click a node, then Shift-click an edge — both stay selected. 3) Shift-click either one again — it toggles back off. 4) Drag a lasso over the middle two nodes — they and their connecting edges are all selected together.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof EdgeSelectionStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Click a node or edge to select it, Shift-click to add/toggle more, or drag a lasso to select a cluster of both.
 * @summary unified node+edge selection with click, shift-toggle, and lasso
 */
export const Default: Story = {}
