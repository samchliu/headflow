import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useEdges, useFlowCanvas, useFlowContext, useHandle, useNode, useSelection, useDraftEdge } from '@headflow/react'
import type { Edge } from '@headflow/react'
import { FlowCanvas } from '@headflow/react-ui'
import { bezierPath } from '@headflow/renderer'
import { SimpleNode, T, toolbar } from './shared'

const BRANCH_COLOR: Record<string, string> = {
  'branch-true':  '#10b981',
  'branch-false': '#ef4444',
  'branch-error': '#f97316',
}
const BRANCH_LABEL: Record<string, string> = {
  'branch-true':  'true',
  'branch-false': 'false',
  'branch-error': 'error',
}

function BranchEdgeLayer() {
  const edges = useEdges()
  const draft = useDraftEdge()

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {edges.map((e: Edge) => {
        const color = BRANCH_COLOR[e.source.handleId] ?? '#818cf8'
        const label = BRANCH_LABEL[e.source.handleId]
        const mx = (e.source.pt.x + e.target.pt.x) / 2
        const my = (e.source.pt.y + e.target.pt.y) / 2
        const lw = label ? label.length * 6 + 10 : 0
        return (
          <g key={e.id}>
            <path d={bezierPath(e.source.pt, e.target.pt)} fill="none" stroke={color} strokeWidth={1.5} />
            {label && (
              <>
                <rect x={mx - lw / 2} y={my - 9} width={lw} height={16} rx={4} fill={color} opacity={0.9} />
                <text x={mx} y={my + 3} textAnchor="middle" fontSize={9}
                  fill="white" fontFamily="ui-monospace, monospace" fontWeight="bold">
                  {label}
                </text>
              </>
            )}
          </g>
        )
      })}
      {draft && (
        <path d={bezierPath(draft.sourcePt, draft.currentPt)}
          fill="none" stroke={T.accent} strokeWidth={1.5} strokeDasharray="5 4" />
      )}
    </svg>
  )
}

function DecisionNode({ defaultPosition }: { defaultPosition: { x: number; y: number } }) {
  const ID = 'decision'
  const nodeRef  = useNode(ID, { defaultPosition })
  const condRef  = useHandle(ID, 'cond-in',      'target')
  const trueRef  = useHandle(ID, 'branch-true',  'source')
  const falseRef = useHandle(ID, 'branch-false', 'source')
  const errorRef = useHandle(ID, 'branch-error', 'source')
  const selected = useSelection().has(ID)

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 180, height: 160,
      background: selected ? '#1a1836' : T.surface,
      border: `1.5px solid ${selected ? T.accent : T.border}`,
      borderTop: `4px solid ${T.accent}`,
      borderRadius: 8, cursor: 'grab', userSelect: 'none',
      color: T.text, fontFamily: 'ui-monospace, monospace',
    }}>
      <div style={{ padding: '7px 14px', borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>
        Decision
      </div>
      <div ref={condRef} data-flow-handle="target" data-flow-handle-id="cond-in"
        style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: T.accent,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.muted }}>cond</div>

      {(['branch-true', 'branch-false', 'branch-error'] as const).map((branch, i) => {
        const pct = `${28 + i * 29}%`
        const ref = [trueRef, falseRef, errorRef][i]
        return (
          <div key={branch}>
            <div ref={ref} data-flow-handle="source" data-flow-handle-id={branch}
              style={{ position: 'absolute', right: -7, top: pct, transform: 'translateY(-50%)',
                width: 14, height: 14, borderRadius: '50%', background: BRANCH_COLOR[branch],
                border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
            />
            <div style={{ position: 'absolute', right: 14, top: pct, transform: 'translateY(-50%)', fontSize: 10, color: BRANCH_COLOR[branch] }}>
              {BRANCH_LABEL[branch]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()

  useEffect(() => {
    const engine = getEngine()
    const onEdge = ({ edge }: { edge: Edge }) => {
      if (!BRANCH_LABEL[edge.source.handleId]) return
      const duplicate = engine.getEdges().some(
        (e) => e.id !== edge.id &&
          e.source.nodeId === edge.source.nodeId &&
          e.source.handleId === edge.source.handleId,
      )
      if (duplicate) engine.removeEdge(edge.id)
    }
    engine.on('edgeCreated', onEdge)
    return () => engine.off('edgeCreated', onEdge)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <span style={{ fontSize: 11, color: T.muted }}>
          Each branch handle accepts one connection · Edge labels are derived from the source handle ID
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <FlowCanvas canvasRef={canvasRef}>
          <SimpleNode id="trigger"  label="Trigger"   kind="input"  defaultPosition={{ x: 30,  y: 160 }} />
          <DecisionNode defaultPosition={{ x: 230, y: 80 }} />
          <SimpleNode id="on-true"  label="On True"   kind="output" defaultPosition={{ x: 490, y: 30  }} />
          <SimpleNode id="on-false" label="On False"  kind="output" defaultPosition={{ x: 490, y: 185 }} />
          <SimpleNode id="on-error" label="On Error"  kind="output" defaultPosition={{ x: 490, y: 335 }} />
          <BranchEdgeLayer />
        </FlowCanvas>
      </div>
    </div>
  )
}

function ConditionalBranchingStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Conditional Branching',
  component: ConditionalBranchingStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Decision nodes are central to any real workflow — one input produces different downstream paths depending on outcome.',
          '',
          '**APIs used**: Multiple named source handles · `useDraftEdge()` for the draft edge preview · `engine.getEdges()` enforces one connection per branch',
          '',
          '**Try this**: 1) Connect Trigger → Decision cond input. 2) Connect Decision true → On True (green edge). 3) Try connecting a second node to the same branch — it is blocked.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ConditionalBranchingStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * True/false/error branches each connect to a different downstream node; edge labels show the branch name.
 * @summary three named output branches with enforced single-connection and colored edge labels
 */
export const Default: Story = {}
