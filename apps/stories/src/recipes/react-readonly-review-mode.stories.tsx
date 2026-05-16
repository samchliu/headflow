import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useFlowContext, useHandle, useNode, useSelection } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { FlowCanvas, EdgeLayer } from '@headflow/react-ui'
import { T, btn, toolbar } from './shared'

const NODES = [
  { id: 'n1', label: 'Source',    kind: 'input'   as const, x: 60,  y: 120 },
  { id: 'n2', label: 'Process A', kind: 'default' as const, x: 260, y: 60  },
  { id: 'n3', label: 'Process B', kind: 'default' as const, x: 260, y: 220 },
  { id: 'n4', label: 'Output',    kind: 'output'  as const, x: 470, y: 140 },
]

function ReviewableNode({
  id, label, kind, defaultPosition, isReadOnly,
}: {
  id: string; label: string; kind: 'input' | 'default' | 'output'
  defaultPosition: { x: number; y: number }; isReadOnly: boolean
}) {
  const nodeRef = useNode(id, { defaultPosition })
  const srcRef = useHandle(id, 'output', 'source')
  const tgtRef = useHandle(id, 'input', 'target')
  const selected = useSelection().has(id)

  const topColor = kind === 'input' ? T.green : kind === 'output' ? T.amber : T.accent
  const borderColor = selected && !isReadOnly ? T.accent : T.border

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 140,
      background: selected && !isReadOnly ? '#1a1836' : T.surface,
      border: `1.5px solid ${borderColor}`,
      borderTop: `4px solid ${topColor}`,
      borderRadius: 8, padding: '10px 14px',
      cursor: isReadOnly ? 'default' : 'grab',
      userSelect: 'none',
      color: isReadOnly ? T.muted : T.text,
      fontSize: 13, fontFamily: 'ui-monospace, monospace',
      pointerEvents: isReadOnly ? 'none' : 'auto',
      opacity: isReadOnly ? 0.8 : 1,
      transition: 'opacity 0.25s, color 0.25s',
    }}>
      <div ref={tgtRef} data-flow-handle="target" data-flow-handle-id="input"
        style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: topColor,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      {isReadOnly && (
        <div style={{ position: 'absolute', top: 4, right: 7, fontSize: 9, color: T.muted, letterSpacing: 1 }}>
          R/O
        </div>
      )}
      {label}
      <div ref={srcRef} data-flow-handle="source" data-flow-handle-id="output"
        style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: T.green,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
    </div>
  )
}

function Inner({ canvasRef, isReadOnly }: {
  canvasRef: (el: HTMLElement | null) => void; isReadOnly: boolean
}) {
  const { getEngine } = useFlowContext()
  const isReadOnlyRef = useRef(isReadOnly)
  useEffect(() => { isReadOnlyRef.current = isReadOnly }, [isReadOnly])

  useEffect(() => {
    const engine = getEngine()
    const onEdge = ({ edge }: { edge: Edge }) => {
      if (isReadOnlyRef.current) engine.removeEdge(edge.id)
    }
    engine.on('edgeCreated', onEdge)
    return () => engine.off('edgeCreated', onEdge)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <FlowCanvas canvasRef={canvasRef}>
        {NODES.map((n) => (
          <ReviewableNode
            key={n.id} id={n.id} label={n.label} kind={n.kind}
            defaultPosition={{ x: n.x, y: n.y }} isReadOnly={isReadOnly}
          />
        ))}
        <EdgeLayer />
      </FlowCanvas>
      {isReadOnly && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1236', border: `1px solid #4c1d95`,
          color: '#c4b5fd', fontSize: 11, fontFamily: 'ui-monospace, monospace',
          padding: '4px 14px', borderRadius: 20, letterSpacing: 1, pointerEvents: 'none',
        }}>
          Review mode — read-only
        </div>
      )}
    </div>
  )
}

function ReadOnlyReviewModeStory() {
  const [isReadOnly, setIsReadOnly] = useState(false)
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <button
          type="button"
          onClick={() => setIsReadOnly((v) => !v)}
          style={{
            ...btn,
            background: isReadOnly ? '#1a1236' : '#14290e',
            borderColor: isReadOnly ? '#4c1d95' : T.green,
            color: isReadOnly ? '#c4b5fd' : T.green,
          }}
        >
          Mode: {isReadOnly ? 'Review (read-only)' : 'Edit'}
        </button>
        <span style={{ fontSize: 11, color: T.muted }}>
          {isReadOnly
            ? 'Nodes are frozen — pan/zoom still works'
            : 'Drag nodes and connect handles, then switch to Review'}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FlowProvider>
          <Inner canvasRef={canvasRef} isReadOnly={isReadOnly} />
        </FlowProvider>
      </div>
    </div>
  )
}

const meta = {
  title: 'Recipes/React/ReadOnly Review Mode',
  component: ReadOnlyReviewModeStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: The same graph component serves both editors and reviewers. Switching modes is one state toggle — no library fork, no duplicate components.',
          '',
          '**APIs used**: `pointer-events: none` on node elements blocks drag + edge-creation · `engine.on("edgeCreated")` + `removeEdge` as a defence-in-depth guard · `isReadOnlyRef` keeps the closure current',
          '',
          '**Try this**: 1) In Edit mode: drag nodes and draw edges. 2) Click "Mode: Edit" to switch to Review — nodes show "R/O", dragging is blocked, pan/zoom still works. 3) Switch back to Edit and resume editing.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ReadOnlyReviewModeStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Build a workflow in Edit mode, then toggle to Review — all node interaction is frozen while pan/zoom stays active.
 * @summary single toggle freezes node drag and edge creation while preserving pan/zoom
 */
export const Default: Story = {}
