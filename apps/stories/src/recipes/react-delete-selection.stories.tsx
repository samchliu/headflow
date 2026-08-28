import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useFlowContext, useNodeRemoval, useSelection, useUndoRedo } from '@headflow/react'
import type { Point } from '@headflow/react'
import { FlowCanvas, EdgeLayer } from '@headflow/react-ui'
import { SimpleNode, T, btn, toolbar } from './shared'

type NodeKind = 'input' | 'default' | 'output'
interface NodeData {
  id: string
  label: string
  kind: NodeKind
  x: number
  y: number
}

const INITIAL_NODES: NodeData[] = [
  { id: 'n1', label: 'Source', kind: 'input', x: 40, y: 130 },
  { id: 'n2', label: 'Transform', kind: 'default', x: 280, y: 130 },
  { id: 'n3', label: 'Sink', kind: 'output', x: 520, y: 130 },
]

const INITIAL_EDGES = [
  { id: 'e1', source: { nodeId: 'n1', handleId: 'output' }, target: { nodeId: 'n2', handleId: 'input' } },
  { id: 'e2', source: { nodeId: 'n2', handleId: 'output' }, target: { nodeId: 'n3', handleId: 'input' } },
]

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES)
  const removedRef = useRef(new Map<string, NodeData>())
  const selected = useSelection()
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  // Pre-wire the starting edges.
  useEffect(() => {
    getEngine().restore({
      nodes: INITIAL_NODES.map((n) => ({ id: n.id, position: { x: n.x, y: n.y } })),
      edges: INITIAL_EDGES,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Node deletion is a two-way contract: core auto-restores the edges and
  // selection state it owns, but YOUR node data (label/kind/etc) is yours to
  // retain so it can reappear on undo.
  useNodeRemoval({
    onRemoveRequested: (nodeId) => {
      setNodes((ns) => {
        const node = ns.find((n) => n.id === nodeId)
        if (node) removedRef.current.set(nodeId, node)
        return ns.filter((n) => n.id !== nodeId)
      })
    },
    onRestoreRequested: (nodeId, position: Point) => {
      const data = removedRef.current.get(nodeId)
      if (!data) return
      setNodes((ns) => [...ns, { ...data, x: position.x, y: position.y }])
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <button
          type="button"
          style={{ ...btn, opacity: canUndo ? 1 : 0.4 }}
          disabled={!canUndo}
          onClick={undo}
        >
          ← Undo
        </button>
        <button
          type="button"
          style={{ ...btn, opacity: canRedo ? 1 : 0.4 }}
          disabled={!canRedo}
          onClick={redo}
        >
          Redo →
        </button>
        <span style={{ fontSize: 11, color: T.muted }}>
          {selected.size === 0 ? 'Nothing selected' : `${selected.size} selected`}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted }}>
          Click canvas to focus · select node(s)/edge(s) · press Delete or Backspace
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <FlowCanvas canvasRef={canvasRef}>
          {nodes.map((n) => (
            <SimpleNode
              key={n.id} id={n.id} label={n.label} kind={n.kind}
              defaultPosition={{ x: n.x, y: n.y }}
            />
          ))}
          <EdgeLayer />
        </FlowCanvas>
      </div>
    </div>
  )
}

function DeleteSelectionStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({})
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Delete Selection',
  component: DeleteSelectionStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Delete/Backspace removing whatever\'s selected — nodes, edges, or both — is table stakes for an editable canvas. Since core owns edges but not your node\'s React data, node deletion is a two-way contract: core cascades edges + selection automatically, your app supplies `useNodeRemoval` to actually unmount (and, for undo, re-mount) the node.',
          '',
          '**APIs used**: `engine.deleteSelection()` (fired by the built-in Delete/Backspace listener) · `useNodeRemoval({ onRemoveRequested, onRestoreRequested })` to sync your own node list · `useUndoRedo()` for the round-trip',
          '',
          "**Try this**: 1) Click the canvas background once so it can receive keyboard focus. 2) Click **Transform**, Shift-click the edge going into **Sink**, then press **Delete** — both vanish in a single action (deleting the node alone would have cascaded its edges anyway). 3) Click **← Undo** — the node, its edges, and the selection all come back in one step.",
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof DeleteSelectionStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Select any mix of nodes and edges, press Delete/Backspace to remove them all in one action, then Undo to restore everything.
 * @summary keyboard delete + removeNode/deleteSelection + useNodeRemoval's app-side restore contract
 */
export const Default: Story = {}
