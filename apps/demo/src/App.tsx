import { type Component, createSignal, For } from 'solid-js'
import {
  createEdges,
  createFlowCanvas,
  createHandle,
  createNode,
  type Edge,
  type Point,
} from '@headflow/solid'
import { bezierPath } from './bezier'

// ── Data ────────────────────────────────────────────────────────────────────

interface NodeData {
  id: string
  label: string
  defaultPosition: Point
  color: string
}

const NODES: NodeData[] = [
  { id: 'input', label: 'Input', defaultPosition: { x: 60, y: 160 }, color: '#6366f1' },
  { id: 'process', label: 'Process', defaultPosition: { x: 280, y: 100 }, color: '#0ea5e9' },
  { id: 'filter', label: 'Filter', defaultPosition: { x: 280, y: 240 }, color: '#0ea5e9' },
  { id: 'output', label: 'Output', defaultPosition: { x: 520, y: 170 }, color: '#10b981' },
]

// ── Node component ───────────────────────────────────────────────────────────

const FlowNode: Component<{ data: NodeData }> = (props) => {
  const { ref: nodeRef } = createNode(props.data.id, {
    defaultPosition: props.data.defaultPosition,
  })
  const { ref: targetRef } = createHandle({
    id: 'in',
    type: 'target',
    nodeId: props.data.id,
  })
  const { ref: sourceRef } = createHandle({
    id: 'out',
    type: 'source',
    nodeId: props.data.id,
  })

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        display: 'flex',
        'align-items': 'center',
        gap: '10px',
        background: '#fff',
        border: `2px solid ${props.data.color}`,
        'border-radius': '10px',
        padding: '10px 14px',
        cursor: 'grab',
        'box-shadow': '0 2px 12px rgba(0,0,0,0.08)',
        'user-select': 'none',
        'min-width': '130px',
        'font-size': '14px',
        'font-weight': '500',
        color: '#1e293b',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Target handle (input port — left) */}
      <div
        ref={targetRef}
        data-flow-handle="target"
        data-flow-handle-id="in"
        title="Connect edge here"
        style={{
          width: '14px',
          height: '14px',
          'border-radius': '50%',
          background: props.data.color,
          'border': '2px solid #fff',
          'box-shadow': `0 0 0 2px ${props.data.color}`,
          cursor: 'crosshair',
          'flex-shrink': '0',
        }}
      />

      <span style={{ flex: 1, 'text-align': 'center' }}>{props.data.label}</span>

      {/* Source handle (output port — right) */}
      <div
        ref={sourceRef}
        data-flow-handle="source"
        data-flow-handle-id="out"
        title="Drag to create edge"
        style={{
          width: '14px',
          height: '14px',
          'border-radius': '50%',
          background: '#10b981',
          'border': '2px solid #fff',
          'box-shadow': '0 0 0 2px #10b981',
          cursor: 'crosshair',
          'flex-shrink': '0',
        }}
      />
    </div>
  )
}

// ── Edge SVG layer ────────────────────────────────────────────────────────────

const EdgeLayer: Component = () => {
  const edges = createEdges()

  return (
    <svg
      style={{
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        'pointer-events': 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
        </marker>
      </defs>
      <For each={edges()}>
        {(edge: Edge) => (
          <path
            d={bezierPath(edge.source.pt, edge.target.pt)}
            fill="none"
            stroke="#6366f1"
            stroke-width="2"
            stroke-linecap="round"
            marker-end="url(#arrow)"
          />
        )}
      </For>
    </svg>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

const Canvas: Component<{ canvasRef: (el: HTMLElement) => void }> = (props) => (
  <div
    ref={props.canvasRef}
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px) 0 0 / 24px 24px',
      overflow: 'hidden',
    }}
  >
    <EdgeLayer />
    <For each={NODES}>{(node) => <FlowNode data={node} />}</For>
  </div>
)

// ── App ────────────────────────────────────────────────────────────────────────

export const App: Component = () => {
  const { canvasRef, FlowProvider } = createFlowCanvas({ allowSelfLoop: false })
  const [hint, setHint] = createSignal(true)

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        height: '100vh',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '12px',
          padding: '0 20px',
          height: '52px',
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          color: '#fff',
          'flex-shrink': '0',
          'box-shadow': '0 2px 8px rgba(99,102,241,0.4)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="5" cy="12" r="3" stroke="white" stroke-width="2" />
          <circle cx="19" cy="5" r="3" stroke="white" stroke-width="2" />
          <circle cx="19" cy="19" r="3" stroke="white" stroke-width="2" />
          <line x1="8" y1="11" x2="16" y2="6" stroke="white" stroke-width="1.5" />
          <line x1="8" y1="13" x2="16" y2="18" stroke="white" stroke-width="1.5" />
        </svg>
        <span style={{ 'font-weight': '600', 'font-size': '16px' }}>HeadFlow</span>
        <span
          style={{
            'font-size': '12px',
            opacity: '0.75',
            background: 'rgba(255,255,255,0.15)',
            padding: '2px 8px',
            'border-radius': '999px',
          }}
        >
          demo
        </span>
      </header>

      {/* Hint bar */}
      {hint() && (
        <div
          style={{
            padding: '8px 20px',
            background: '#f0fdf4',
            'border-bottom': '1px solid #bbf7d0',
            'font-size': '13px',
            color: '#15803d',
            display: 'flex',
            'align-items': 'center',
            gap: '8px',
          }}
        >
          <span>
            💡 <strong>Drag</strong> nodes to move them. <strong>Drag</strong> a green handle to
            connect it to a purple handle on another node.
          </span>
          <button
            onClick={() => setHint(false)}
            style={{
              'margin-left': 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#15803d',
              'font-size': '16px',
              'line-height': '1',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Canvas — FlowProvider wraps Canvas so createEdges() + createNode() have context */}
      <FlowProvider>
        <main style={{ flex: '1', overflow: 'hidden' }}>
          <Canvas canvasRef={canvasRef} />
        </main>
      </FlowProvider>
    </div>
  )
}
