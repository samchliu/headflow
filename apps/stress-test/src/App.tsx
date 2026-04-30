import { type Component, For } from 'solid-js'
import { createEdges, createFlowCanvas, createHandle, createNode, type Edge } from '@headflow/solid'

const NODE_COUNT = 100
const COLS = 10
const CELL_W = 160
const CELL_H = 100

// Generate a grid of N nodes
const NODES = Array.from({ length: NODE_COUNT }, (_, i) => ({
  id: `n${i}`,
  label: `Node ${i}`,
  position: {
    x: (i % COLS) * CELL_W + 20,
    y: Math.floor(i / COLS) * CELL_H + 20,
  },
}))

const StressNode: Component<{ id: string; label: string; x: number; y: number }> = (props) => {
  const { ref: nodeRef } = createNode(props.id, {
    defaultPosition: { x: props.x, y: props.y },
  })
  const { ref: targetRef } = createHandle({ id: 'in', type: 'target', nodeId: props.id })
  const { ref: sourceRef } = createHandle({ id: 'out', type: 'source', nodeId: props.id })

  return (
    <div
      data-node-id={props.id}
      ref={nodeRef}
      style={{
        position: 'absolute',
        background: '#fff',
        border: '1px solid #6366f1',
        'border-radius': '6px',
        padding: '6px 10px',
        cursor: 'grab',
        display: 'flex',
        'align-items': 'center',
        gap: '6px',
        'font-size': '11px',
        'user-select': 'none',
        'white-space': 'nowrap',
      }}
    >
      <div
        ref={targetRef}
        data-flow-handle="target"
        data-flow-handle-id="in"
        style={{
          width: '10px',
          height: '10px',
          'border-radius': '50%',
          background: '#6366f1',
          'flex-shrink': '0',
          cursor: 'crosshair',
        }}
      />
      {props.label}
      <div
        ref={sourceRef}
        data-flow-handle="source"
        data-flow-handle-id="out"
        style={{
          width: '10px',
          height: '10px',
          'border-radius': '50%',
          background: '#10b981',
          'flex-shrink': '0',
          cursor: 'crosshair',
        }}
      />
    </div>
  )
}

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
      <For each={edges()}>
        {(edge: Edge) => (
          <line
            x1={edge.source.pt.x}
            y1={edge.source.pt.y}
            x2={edge.target.pt.x}
            y2={edge.target.pt.y}
            stroke="#6366f1"
            stroke-width="1"
          />
        )}
      </For>
    </svg>
  )
}

const Canvas: Component<{ canvasRef: (el: HTMLElement) => void }> = (props) => (
  <div
    id="canvas"
    ref={props.canvasRef}
    style={{
      position: 'relative',
      width: `${COLS * CELL_W + 40}px`,
      height: `${Math.ceil(NODE_COUNT / COLS) * CELL_H + 40}px`,
    }}
  >
    <EdgeLayer />
    <For each={NODES}>
      {(n) => <StressNode id={n.id} label={n.label} x={n.position.x} y={n.position.y} />}
    </For>
  </div>
)

export const App: Component = () => {
  const { canvasRef, FlowProvider } = createFlowCanvas({ allowSelfLoop: false })
  return (
    <FlowProvider>
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          background: '#f8fafc',
        }}
      >
        <Canvas canvasRef={canvasRef} />
      </div>
    </FlowProvider>
  )
}
