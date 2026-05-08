import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useFlowCanvas, useFlowContext, useHandle, useNode, useSelection } from '@headflow/react'
import { EdgeLayer, WorldCanvas, T, btn, toolbar } from './shared'

const NODE_IDS = ['source', 'proc-a', 'filter', 'store', 'orphan'] as const
type NodeId = typeof NODE_IDS[number]

const NODE_META: Record<NodeId, { label: string; kind: 'input' | 'default' | 'output'; requiresInput: boolean }> = {
  source:  { label: 'Data Source',  kind: 'input',   requiresInput: false },
  'proc-a':{ label: 'Process A',    kind: 'default',  requiresInput: true  },
  filter:  { label: 'Filter',       kind: 'default',  requiresInput: true  },
  store:   { label: 'Storage',      kind: 'output',   requiresInput: true  },
  orphan:  { label: 'Orphan Task',  kind: 'default',  requiresInput: false },
}

const DEFAULT_POSITIONS: Record<NodeId, { x: number; y: number }> = {
  source:   { x: 40,  y: 160 },
  'proc-a': { x: 250, y: 70  },
  filter:   { x: 250, y: 260 },
  store:    { x: 460, y: 165 },
  orphan:   { x: 460, y: 330 },
}

interface ValidationError {
  nodeId: NodeId | null
  message: string
}

function detectCycle(edges: { source: { nodeId: string }; target: { nodeId: string } }[]): boolean {
  const adj = new Map<string, string[]>(NODE_IDS.map(id => [id, []]))
  edges.forEach(e => adj.get(e.source.nodeId)?.push(e.target.nodeId))
  const visited = new Set<string>()
  const inStack = new Set<string>()
  function dfs(node: string): boolean {
    if (inStack.has(node)) return true
    if (visited.has(node)) return false
    visited.add(node)
    inStack.add(node)
    for (const n of adj.get(node) ?? []) { if (dfs(n)) return true }
    inStack.delete(node)
    return false
  }
  return NODE_IDS.some(n => !visited.has(n) && dfs(n))
}

function ValidatedNode({
  id,
  defaultPosition,
  isError,
}: {
  id: NodeId
  defaultPosition: { x: number; y: number }
  isError: boolean
}) {
  const { label, kind, requiresInput } = NODE_META[id]
  const nodeRef = useNode(id, { defaultPosition })
  const srcRef  = useHandle(id, 'output', 'source')
  const tgtRef  = useHandle(id, 'input',  'target')
  const selected = useSelection().has(id)

  const topColor = kind === 'input' ? T.green : kind === 'output' ? T.amber : T.accent
  const borderColor = isError ? '#ef4444' : selected ? T.accent : T.border
  const bgColor = isError ? '#1f0a0a' : selected ? '#1a1836' : T.surface

  return (
    <div ref={nodeRef} style={{
      position: 'absolute', top: 0, left: 0, width: 150,
      background: bgColor,
      border: `1.5px solid ${borderColor}`,
      borderTop: `4px solid ${isError ? '#ef4444' : topColor}`,
      borderRadius: 8, padding: '10px 14px',
      cursor: 'grab', userSelect: 'none',
      color: T.text, fontSize: 13, fontFamily: 'ui-monospace, monospace',
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      {/* Target handle */}
      <div ref={tgtRef} data-flow-handle="target" data-flow-handle-id="input"
        style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: topColor,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
      {/* Required input marker */}
      {requiresInput && (
        <div style={{ fontSize: 9, color: isError ? '#fca5a5' : T.muted, marginBottom: 3, letterSpacing: 1 }}>
          {isError ? '! needs input' : 'req. input'}
        </div>
      )}
      {label}
      {/* Source handle */}
      <div ref={srcRef} data-flow-handle="source" data-flow-handle-id="output"
        style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 14, borderRadius: '50%', background: T.green,
          border: `2px solid ${T.bg}`, cursor: 'crosshair' }}
      />
    </div>
  )
}

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [errorNodes, setErrorNodes] = useState<Set<NodeId>>(new Set())
  const [validated, setValidated] = useState(false)

  const validate = () => {
    const allEdges = getEngine().getEdges()
    const result: ValidationError[] = []
    const errSet = new Set<NodeId>()

    const hasOutgoing = new Set(allEdges.map(e => e.source.nodeId))
    const hasIncoming = new Set(allEdges.map(e => e.target.nodeId))

    // Isolated: no edges at all
    NODE_IDS.forEach(id => {
      if (!hasOutgoing.has(id) && !hasIncoming.has(id)) {
        result.push({ nodeId: id, message: `"${NODE_META[id].label}" is isolated — no connections` })
        errSet.add(id)
      }
    })

    // Missing required input
    NODE_IDS.forEach(id => {
      if (NODE_META[id].requiresInput && !hasIncoming.has(id) && !errSet.has(id)) {
        result.push({ nodeId: id, message: `"${NODE_META[id].label}" has no incoming connection (required)` })
        errSet.add(id)
      }
    })

    // Cycle detection
    if (detectCycle(allEdges)) {
      result.push({ nodeId: null, message: 'Graph contains a cycle — outputs must not loop back to inputs' })
    }

    setErrors(result)
    setErrorNodes(errSet)
    setValidated(true)
  }

  const reset = () => { setErrors([]); setErrorNodes(new Set()); setValidated(false) }

  const panelStyle: CSSProperties = {
    maxHeight: 160,
    overflowY: 'auto',
    background: '#0a0a0a',
    borderTop: `1px solid ${T.border}`,
    padding: '8px 14px',
    flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <button type="button" style={btn} onClick={validate}>
          Validate
        </button>
        {validated && (
          <button type="button" style={{ ...btn, opacity: 0.6 }} onClick={reset}>
            Clear
          </button>
        )}
        {validated && (
          <span style={{ fontSize: 12, color: errors.length === 0 ? T.green : '#ef4444', fontFamily: 'ui-monospace, monospace' }}>
            {errors.length === 0 ? 'All checks passed — ready to publish' : `${errors.length} issue${errors.length > 1 ? 's' : ''} found`}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted }}>
          Build a workflow, then click Validate
        </span>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <WorldCanvas canvasRef={canvasRef}>
          {NODE_IDS.map(id => (
            <ValidatedNode
              key={id}
              id={id}
              defaultPosition={DEFAULT_POSITIONS[id]}
              isError={errorNodes.has(id)}
            />
          ))}
          <EdgeLayer />
        </WorldCanvas>
      </div>

      {validated && errors.length > 0 && (
        <div style={panelStyle}>
          {errors.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < errors.length - 1 ? `1px solid #1a1a1a` : 'none' }}>
              <span style={{ color: '#ef4444', fontSize: 12, flexShrink: 0 }}>!</span>
              <span style={{ fontSize: 12, color: '#fca5a5', fontFamily: 'ui-monospace, monospace' }}>{e.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * A "Validate" button runs graph checks (isolation, missing required inputs, cycles) using `engine.getEdges()`.
 * Failing nodes are highlighted with a red border; a panel lists each issue by name.
 * @summary graph validation before publish: isolation, missing inputs, cycle detection via engine.getEdges()
 */
function ValidationBeforePublishStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Validation Before Publish',
  component: ValidationBeforePublishStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Before deploying a workflow you need to verify it is complete — no floating nodes, no missing inputs, no cycles. All validation runs on the serialized edge list with no library changes.',
          '',
          '**APIs used**: `engine.getEdges()` to inspect topology · DFS cycle detection · `isError` prop drives red-border highlight on nodes',
          '',
          '**Try this**: 1) Click Validate immediately — "Orphan Task" is isolated and "Process A"/"Filter"/"Storage" are flagged. 2) Connect Data Source → Process A → Storage. 3) Validate again — fewer errors. 4) Connect all remaining nodes; validate passes.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ValidationBeforePublishStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Initial graph has an isolated node and missing required inputs; connect nodes until all checks pass.
 * @summary isolation + missing-input + cycle checks; red borders and error panel guide fixes
 */
export const Default: Story = {}
