import type { Meta, StoryObj } from '@storybook/react'
import { useCallback, useEffect, useState } from 'react'
import { useFlowCanvas, useFlowContext } from '@headflow/react'
import { EdgeLayer, SimpleNode, WorldCanvas, T, btn, toolbar } from './shared'

const NODES = [
  { id: 'n1', label: 'Alpha', kind: 'input' as const, x: 60, y: 120 },
  { id: 'n2', label: 'Beta', kind: 'default' as const, x: 260, y: 70 },
  { id: 'n3', label: 'Gamma', kind: 'output' as const, x: 460, y: 120 },
]

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const sync = useCallback(() => {
    const engine = getEngine()
    setCanUndo(engine.canUndo())
    setCanRedo(engine.canRedo())
  }, [getEngine])

  useEffect(() => {
    const engine = getEngine()
    sync()
    engine.on('nodeMoved', sync)
    engine.on('edgeCreated', sync)
    engine.on('edgeDeleted', sync)
    return () => {
      engine.off('nodeMoved', sync)
      engine.off('edgeCreated', sync)
      engine.off('edgeDeleted', sync)
    }
  }, [getEngine, sync])

  const handleUndo = () => {
    getEngine().undo()
    sync()
  }

  const handleRedo = () => {
    getEngine().redo()
    sync()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <button
          type="button"
          style={{ ...btn, opacity: canUndo ? 1 : 0.4 }}
          disabled={!canUndo}
          onClick={handleUndo}
        >
          ← Undo
        </button>
        <button
          type="button"
          style={{ ...btn, opacity: canRedo ? 1 : 0.4 }}
          disabled={!canRedo}
          onClick={handleRedo}
        >
          Redo →
        </button>
        <span style={{ fontSize: 11, color: canUndo ? T.green : T.muted }}>
          {canUndo ? 'can undo' : 'nothing to undo'}
        </span>
        <span style={{ fontSize: 11, color: T.muted }}>·</span>
        <span style={{ fontSize: 11, color: canRedo ? T.amber : T.muted }}>
          {canRedo ? 'can redo' : 'nothing to redo'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted }}>
          Drag nodes or draw edges, then undo/redo
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <WorldCanvas canvasRef={canvasRef}>
          {NODES.map((n) => (
            <SimpleNode
              key={n.id}
              id={n.id}
              label={n.label}
              kind={n.kind}
              defaultPosition={{ x: n.x, y: n.y }}
            />
          ))}
          <EdgeLayer />
        </WorldCanvas>
      </div>
    </div>
  )
}

/**
 * Shows the built-in undo/redo stack: every node drag and edge change is recorded automatically.
 * Buttons disable when the stack is empty; no extra state management is required.
 * @summary built-in undo/redo stack tracks node moves and edge changes automatically
 */
function UndoRedoStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({})

  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Undo & Redo',
  component: UndoRedoStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Editable canvases need a reliable undo stack — users expect Cmd+Z to work after every node move or connection.',
          '',
          '**APIs used**: `engine.undo()`, `engine.redo()`, `engine.canUndo()`, `engine.canRedo()`',
          '',
          '**Try this**: 1) Drag a node or draw an edge. 2) Click **← Undo** — the action is reversed. 3) Click **Redo →** to re-apply. Buttons disable automatically when there is nothing to undo/redo.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof UndoRedoStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Drag a node or draw an edge, click Undo to reverse it, then Redo to re-apply.
 * @summary Undo reverses node moves and edge changes; Redo re-applies them
 */
export const Default: Story = {}
