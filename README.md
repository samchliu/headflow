# HeadFlow

**Headless node-graph interaction engine.** Pure interaction logic — zero styling, zero opinion on how your nodes look.

HeadFlow gives you drag, edge creation, lasso selection, and coordinate transforms via a simple attribute-based API. You bring the HTML and CSS; the library manages everything that happens when users interact with it.

## Packages

| Package | Description |
|---------|-------------|
| [`@headflow/core`](./packages/core) | Framework-agnostic engine — TypeScript, no dependencies except `mitt` |
| [`@headflow/solid`](./packages/solid) | SolidJS adapter — reactive primitives (`createNode`, `createHandle`, `createEdges`, `createSelection`) |
| [`@headflow/react`](./packages/react) | React adapter — hooks (`useNode`, `useHandle`, `useEdges`, `useSelection`, `useLasso`) |

## Quick start

### React

```tsx
import { useFlowCanvas, useNode, useHandle, useEdges } from '@headflow/react'

function App() {
  const { canvasRef, FlowProvider } = useFlowCanvas()

  return (
    <FlowProvider>
      <div ref={canvasRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MyNode id="n1" defaultPosition={{ x: 60, y: 100 }} />
        <MyNode id="n2" defaultPosition={{ x: 300, y: 100 }} />
        <EdgeLayer />
      </div>
    </FlowProvider>
  )
}

function MyNode({ id, defaultPosition }) {
  const nodeRef = useNode(id, { defaultPosition })
  const outputRef = useHandle(id, 'out', 'source')
  const inputRef = useHandle(id, 'in', 'target')

  return (
    <div ref={nodeRef} style={{ position: 'absolute' }}>
      <div ref={inputRef} />
      My Node
      <div ref={outputRef} />
    </div>
  )
}

function EdgeLayer() {
  const edges = useEdges()
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {edges.map(e => (
        <line key={e.id}
          x1={e.source.pt.x} y1={e.source.pt.y}
          x2={e.target.pt.x} y2={e.target.pt.y}
          stroke="#888"
        />
      ))}
    </svg>
  )
}
```

### SolidJS

```tsx
import { createFlowCanvas, createNode, createHandle, createEdges } from '@headflow/solid'

const { canvasRef, FlowProvider } = createFlowCanvas()

function App() {
  return (
    <FlowProvider>
      <div ref={canvasRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MyNode id="n1" />
        <EdgeLayer />
      </div>
    </FlowProvider>
  )
}

function MyNode(props) {
  const { nodeRef } = createNode(props.id, { defaultPosition: { x: 60, y: 100 } })
  const { handleRef: outputRef } = createHandle(props.id, 'out', 'source')
  const { handleRef: inputRef } = createHandle(props.id, 'in', 'target')

  return (
    <div ref={nodeRef} style={{ position: 'absolute' }}>
      <div ref={inputRef} />
      My Node
      <div ref={outputRef} />
    </div>
  )
}

function EdgeLayer() {
  const edges = createEdges()
  return (
    <svg style={{ position: 'absolute', inset: 0, 'pointer-events': 'none' }}>
      <For each={edges()}>
        {e => (
          <line x1={e.source.pt.x} y1={e.source.pt.y}
                x2={e.target.pt.x} y2={e.target.pt.y} stroke="#888" />
        )}
      </For>
    </svg>
  )
}
```

### Vanilla (no framework)

```ts
import { createFlow } from '@headflow/core'

const container = document.getElementById('canvas')!
const flow = createFlow({ container })

// Add data-flow-node / data-flow-handle attributes to your DOM —
// the MutationObserver picks them up automatically.
flow.on('edgeCreated', ({ edge }) => console.log('new edge:', edge))
flow.on('nodeMoved', ({ nodeId, position }) => console.log(nodeId, position))

// Cleanup on teardown
flow.destroy()
```

## Attribute API

Any DOM element inside the canvas container becomes a HeadFlow element by adding attributes:

| Attribute | Value | Effect |
|-----------|-------|--------|
| `data-flow-node` | node id | Marks element as a draggable node |
| `data-flow-handle` | `"source"` \| `"target"` | Marks element as a connection handle |
| `data-flow-handle-id` | handle id | Unique id for the handle within its node |
| `data-flow-handle-multiple` | _(present)_ | Allows multiple edges to connect to a target handle |

## Engine API

```ts
const flow = createFlow({ container, allowSelfLoop: false })

// Events
flow.on('nodeAdded', ({ nodeId }) => …)
flow.on('nodeRemoved', ({ nodeId }) => …)
flow.on('nodeMoved', ({ nodeId, position }) => …)
flow.on('edgeCreated', ({ edge }) => …)
flow.on('edgeDeleted', ({ edgeId }) => …)
flow.on('edgeCreateCancelled', ({ sourceNodeId, sourceHandleId }) => …)
flow.on('draftEdgeMove', ({ sourceNodeId, sourceHandleId, sourcePt, currentPt }) => …)
flow.on('selectionChanged', ({ selected }) => …)  // Set<string>
flow.on('lassoUpdate', ({ rect }) => …)            // viewport-space { x, y, w, h }
flow.on('lassoEnd', undefined => …)

// State
flow.getEdges()           // Edge[]
flow.serialize()          // SerializedGraph
flow.restore(state)       // load SerializedGraph
flow.getSelection()       // Set<string>

// Mutations
flow.setTransform({ scale, translateX, translateY })
flow.setNodePosition(nodeId, { x, y })
flow.removeEdge(edgeId)
flow.selectNode(nodeId)
flow.selectNodes(nodeIds)
flow.deselectNode(nodeId)
flow.clearSelection()
flow.moveSelectionBy({ x, y })

// Lifecycle
flow.destroy()
```

## Interaction model

| Gesture | Effect |
|---------|--------|
| Drag node | Move node (group-moves other selected nodes) |
| Drag from source handle → target handle | Create edge |
| Drag on empty canvas | Start lasso selection |
| Shift + drag on empty canvas | Append to selection |
| Click node (not selected) | Replace selection |

## Development

```bash
# Install
pnpm install

# Build all packages
pnpm build

# Run unit tests
pnpm --filter @headflow/core test
pnpm --filter @headflow/solid test
pnpm --filter @headflow/react test

# Run interactive demos
pnpm --filter @headflow/demo dev          # SolidJS demo
pnpm --filter @headflow/demo-react dev   # React demo

# Performance benchmark (Playwright required)
pnpm --filter @headflow/stress-test test:perf
```

## Monorepo structure

```
.
├── packages/
│   ├── core/        @headflow/core    — interaction engine
│   ├── solid/       @headflow/solid   — SolidJS adapter
│   └── react/       @headflow/react   — React adapter
└── apps/
    ├── demo/        SolidJS interactive demo
    ├── demo-react/  React interactive demo
    └── stress-test/ 100-node Playwright perf benchmark
```

## Versioning

This project uses [Changesets](https://github.com/changesets/changesets). To release a new version:

```bash
pnpm changeset        # describe your changes
pnpm version-packages # bump versions + update changelogs
pnpm release          # publish to npm
```

## License

MIT
