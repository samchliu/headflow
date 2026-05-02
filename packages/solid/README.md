# @headflow/solid

SolidJS bindings for **[HeadFlow](https://github.com/samchliu/headflow)** — the headless node-graph engine from `@headflow/core`. Exposes **reactive primitives** (`createNode`, `createHandle`, `createEdges`, …) so nodes, handles, and edges stay in sync with Solid’s fine-grained reactivity.

**Peer:** `solid-js` (^1.8).

---

## What you get

| API | Role |
|-----|------|
| **`createFlowCanvas`** | Returns `canvasRef`, `FlowProvider`, and scopes one engine instance |
| **`createNode`** | Ref + options for draggable nodes (`defaultPosition`, etc.) |
| **`createHandle`** | Refs for `source` / `target` handles |
| **`createEdges`** | Accessor of edge list with updated anchor points |
| **`createSelection` / `createLasso`** | Selection and lasso overlay |
| **`useFlowContext`** | Imperative access to `FlowEngine` |

Core types (`Edge`, `Point`, `SerializedGraph`, `FlowEngine`, …) are **re-exported** from `@headflow/core`.

---

## Install

```bash
npm install @headflow/solid @headflow/core
```

---

## Minimal example

```tsx
import { createFlowCanvas, createNode, createHandle, createEdges } from '@headflow/solid'
import { For } from 'solid-js/web'

const { canvasRef, FlowProvider } = createFlowCanvas()

export function App() {
  return (
    <FlowProvider>
      <div ref={canvasRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MyNode id="n1" />
        <EdgeLayer />
      </div>
    </FlowProvider>
  )
}

function MyNode(props: { id: string }) {
  const { nodeRef } = createNode(props.id, { defaultPosition: { x: 60, y: 100 } })
  const { handleRef: outRef } = createHandle(props.id, 'out', 'source')
  const { handleRef: inRef } = createHandle(props.id, 'in', 'target')

  return (
    <div ref={nodeRef} style={{ position: 'absolute' }}>
      <div ref={inRef} />
      My node
      <div ref={outRef} />
    </div>
  )
}

function EdgeLayer() {
  const edges = createEdges()
  return (
    <svg style={{ position: 'absolute', inset: 0, 'pointer-events': 'none' }}>
      <For each={edges()}>
        {(e) => (
          <line
            x1={e.source.pt.x}
            y1={e.source.pt.y}
            x2={e.target.pt.x}
            y2={e.target.pt.y}
            stroke="#888"
          />
        )}
      </For>
    </svg>
  )
}
```

Styling and layout are entirely yours; the engine only needs refs and the **`data-flow-*`** contract (see core docs).

---

## Documentation

- **Repository, attribute API, interaction model:**  
  [github.com/samchliu/headflow](https://github.com/samchliu/headflow)
- **Issues:** [github.com/samchliu/headflow/issues](https://github.com/samchliu/headflow/issues)

---

## See also

| Package | Use case |
|---------|----------|
| [`@headflow/core`](https://www.npmjs.com/package/@headflow/core) | Engine-only / vanilla |
| [`@headflow/react`](https://www.npmjs.com/package/@headflow/react) | React hooks |
| [`@headflow/renderer`](https://www.npmjs.com/package/@headflow/renderer) | SVG path & lasso helpers |

## License

MIT
