import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { useFlowCanvas, useFlowContext } from '@headflow/react'
import { EdgeLayer, SimpleNode, WorldCanvas, T, btn, toolbar } from './shared'

const NODES = [
  { id: 'n1', label: 'Source', kind: 'input' as const, x: 60, y: 120 },
  { id: 'n2', label: 'Process', kind: 'default' as const, x: 260, y: 80 },
  { id: 'n3', label: 'Output', kind: 'output' as const, x: 460, y: 120 },
]

function Inner({
  canvasRef,
  json,
  setJson,
}: {
  canvasRef: (el: HTMLElement | null) => void
  json: string
  setJson: (v: string) => void
}) {
  const { getEngine } = useFlowContext()

  const handleRestore = () => {
    try {
      getEngine().restore(JSON.parse(json))
    } catch {
      // invalid JSON — ignore
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <button
          type="button"
          style={btn}
          onClick={() => setJson(JSON.stringify(getEngine().serialize(), null, 2))}
        >
          Export JSON
        </button>
        <button
          type="button"
          style={{ ...btn, opacity: json ? 1 : 0.4 }}
          disabled={!json}
          onClick={handleRestore}
        >
          Restore
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted }}>
          Drag · Connect · Export → edit textarea → Restore
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
      {json && (
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          style={{
            height: 160,
            resize: 'vertical',
            padding: '8px 12px',
            background: '#0a0a0a',
            color: '#a5b4fc',
            border: 'none',
            borderTop: `1px solid ${T.border}`,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            outline: 'none',
          }}
        />
      )}
    </div>
  )
}

/**
 * Demonstrates canvas save/load using `engine.serialize()` and `engine.restore()`.
 * Serialized state is plain JSON (node positions + edge topology) — easy to store in a database or URL.
 * @summary serialize canvas state to JSON and restore it, including edited values
 */
function PersistAndRestoreStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({})
  const [json, setJson] = useState('')

  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} json={json} setJson={setJson} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Persist & Restore',
  component: PersistAndRestoreStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Any production canvas (workflow builder, diagram editor) needs to save and reload state across sessions.',
          '',
          '**APIs used**: `useFlowCanvas`, `useFlowContext` → `engine.serialize()`, `engine.restore()`',
          '',
          '**Try this**: 1) Drag nodes and draw edges. 2) Click **Export JSON** — positions + topology appear below. 3) Edit the JSON (change an `x` value). 4) Click **Restore** — the canvas updates.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof PersistAndRestoreStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Export positions and edges to JSON, edit a coordinate in the textarea, then Restore to verify the round-trip.
 * @summary edit serialized JSON inline and restore to confirm round-trip fidelity
 */
export const Default: Story = {}
