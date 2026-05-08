import { useEffect, useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useFlowContext, useHandle, useNode, useSelection } from '@headflow/react'
import { EdgeLayer, SimpleNode, WorldCanvas, T, toolbar } from './shared'

// Group canvas origin and child absolute positions
const GRP_DEFAULT = { x: 160, y: 80 }
const GRP_W = 250
const GRP_H = 220
const CHILDREN_DEFAULT: Record<string, { x: number; y: number }> = {
  step1: { x: GRP_DEFAULT.x + 30, y: GRP_DEFAULT.y + 55  },
  step2: { x: GRP_DEFAULT.x + 30, y: GRP_DEFAULT.y + 145 },
}

function GroupNode({ defaultPosition }: { defaultPosition: { x: number; y: number } }) {
  const ID = 'grp'
  const nodeRef = useNode(ID, { defaultPosition })
  const inRef = useHandle(ID, 'grp-in', 'target')
  const outRef = useHandle(ID, 'grp-out', 'source')
  const selected = useSelection().has(ID)

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: GRP_W,
        height: GRP_H,
        background: 'rgba(99,102,241,0.04)',
        border: `2px dashed ${selected ? T.accent : '#3a3a6a'}`,
        borderRadius: 12,
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {/* Group label — sits above the top border */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 14,
          fontSize: 10,
          color: T.accent,
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: 1,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        Data Pipeline
      </div>

      {/* External input handle — left edge, vertically centered */}
      <div
        ref={inRef}
        data-flow-handle="target"
        data-flow-handle-id="grp-in"
        style={{
          position: 'absolute',
          left: -9,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: T.green,
          border: `2px solid ${T.bg}`,
          cursor: 'crosshair',
        }}
      />

      {/* External output handle — right edge, vertically centered */}
      <div
        ref={outRef}
        data-flow-handle="source"
        data-flow-handle-id="grp-out"
        style={{
          position: 'absolute',
          right: -9,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: T.amber,
          border: `2px solid ${T.bg}`,
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()
  // Track mutable positions without causing re-renders
  const childPosRef = useRef({ ...CHILDREN_DEFAULT })
  const grpPrevRef = useRef({ ...GRP_DEFAULT })

  useEffect(() => {
    const engine = getEngine()
    const onMoved = ({ nodeId, position }: { nodeId: string; position: { x: number; y: number } }) => {
      // Only react to the group node moving
      if (nodeId !== 'grp') return
      const dx = position.x - grpPrevRef.current.x
      const dy = position.y - grpPrevRef.current.y
      grpPrevRef.current = { x: position.x, y: position.y }

      // Move every child by the same delta
      for (const [childId, pos] of Object.entries(childPosRef.current)) {
        const next = { x: pos.x + dx, y: pos.y + dy }
        childPosRef.current[childId] = next
        engine.setNodePosition(childId, next)
      }
    }

    engine.on('nodeMoved', onMoved)
    return () => engine.off('nodeMoved', onMoved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <span style={{ fontSize: 11, color: T.muted }}>
          Drag the dashed group frame — Step 1 and Step 2 follow · Children can also be moved independently
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <WorldCanvas canvasRef={canvasRef}>
          {/* Group rendered first so children appear on top */}
          <GroupNode defaultPosition={GRP_DEFAULT} />

          {/* Child nodes — rendered after so they stack above the group */}
          <SimpleNode id="step1" label="Step 1: Extract" kind="default" defaultPosition={CHILDREN_DEFAULT.step1} />
          <SimpleNode id="step2" label="Step 2: Filter"  kind="default" defaultPosition={CHILDREN_DEFAULT.step2} />

          {/* External I/O nodes */}
          <SimpleNode id="ext-in"  label="Ext Input"  kind="input"  defaultPosition={{ x: 20,  y: 200 }} />
          <SimpleNode id="ext-out" label="Ext Output" kind="output" defaultPosition={{ x: 490, y: 200 }} />

          <EdgeLayer />
        </WorldCanvas>
      </div>
    </div>
  )
}

/**
 * Implements node grouping without core changes: a container node moves its children by computing
 * the drag delta from `nodeMoved` and calling `setNodePosition` on each child.
 * @summary group node moves children via nodeMoved delta + setNodePosition, all in application code
 */
function GroupedWorkflowStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Grouped Workflow',
  component: GroupedWorkflowStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: HeadFlow has no built-in grouping model — you own the relationship. This recipe shows a container node whose children follow it when dragged, implemented in ~15 lines of application code using `nodeMoved` + `setNodePosition`.',
          '',
          '**APIs used**: `engine.on("nodeMoved")` · `engine.setNodePosition(id, pos)` · `useNode` + `useHandle` for the group boundary handles',
          '',
          '**Try this**: 1) Drag the dashed "Data Pipeline" frame — Step 1 and Step 2 follow. 2) Connect Ext Input → group green handle, then group amber handle → Ext Output. 3) Drag Step 1 independently — it moves freely (children can still be repositioned within the group).',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof GroupedWorkflowStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Drag the dashed "Data Pipeline" frame to move Step 1 and Step 2 together; children remain individually draggable.
 * @summary group-drag with child follow; children stay independently repositionable
 */
export const Default: Story = {}
