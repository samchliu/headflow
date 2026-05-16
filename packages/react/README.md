# @headflow/react

React bindings for **[HeadFlow](https://github.com/samchliu/headflow)** — a headless node-graph engine. This package wraps `@headflow/core` with **hooks** and a small **provider** so you can build flow UIs with refs and re-renders, without the engine dictating DOM structure or CSS.

**Requirements:** React **18+**, `react-dom` **18+**.

---

## What you get

- **`useFlowCanvas`** — Canvas ref + `FlowProvider` to scope one flow instance.
- **`useNode` / `useHandle`** — Attach draggable nodes and source/target handles by ref.
- **`useEdges`** — Reactive edge list with screen-space endpoints for your SVG/canvas layer.
- **`useSelection` / `useLasso`** — Selection state and lasso overlay helpers.
- **`useDraftEdge`** — Tracks the in-progress edge while the user drags from a source handle; clears on drop or cancel.
- **`useUndoRedo`** — Exposes `undo`, `redo`, and reactive `canUndo`/`canRedo` flags; stays in sync automatically.
- **`useViewport`** — Returns the current canvas transform (`scale`, `translateX`, `translateY`); re-renders on every pan/zoom.
- **`useFlowContext`** — Access the underlying `FlowEngine` when you need imperative APIs.

Types such as `Edge`, `Point`, `CanvasTransform`, `SerializedGraph`, and `FlowEngine` are **re-exported** from `@headflow/core` for convenience.

---

## Install

```bash
npm install @headflow/react @headflow/core
```

Peers: `react`, `react-dom` (>=18).

---

## Minimal example

```tsx
import { useFlowCanvas, useNode, useHandle, useEdges } from '@headflow/react'

export function App() {
  const { canvasRef, FlowProvider } = useFlowCanvas()

  return (
    <FlowProvider>
      <div
        ref={canvasRef}
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        <MyNode id="n1" defaultPosition={{ x: 60, y: 100 }} />
        <MyNode id="n2" defaultPosition={{ x: 300, y: 100 }} />
        <EdgeLayer />
      </div>
    </FlowProvider>
  )
}

function MyNode({ id, defaultPosition }: { id: string; defaultPosition: { x: number; y: number } }) {
  const nodeRef = useNode(id, { defaultPosition })
  const outRef = useHandle(id, 'out', 'source')
  const inRef = useHandle(id, 'in', 'target')

  return (
    <div ref={nodeRef} style={{ position: 'absolute' }}>
      <div ref={inRef} />
      My node
      <div ref={outRef} />
    </div>
  )
}

function EdgeLayer() {
  const edges = useEdges()
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {edges.map((e) => (
        <line
          key={e.id}
          x1={e.source.pt.x}
          y1={e.source.pt.y}
          x2={e.target.pt.x}
          y2={e.target.pt.y}
          stroke="#888"
        />
      ))}
    </svg>
  )
}
```

Render your own nodes (cards, ports, icons); HeadFlow only needs refs and the attribute contract documented in **`@headflow/core`**.

---

## Documentation

- **Full quick start, attribute table, gestures, monorepo layout:**  
  [github.com/samchliu/headflow](https://github.com/samchliu/headflow)
- **Issues:** [github.com/samchliu/headflow/issues](https://github.com/samchliu/headflow/issues)

---

## See also

| Package | Use case |
|---------|----------|
| [`@headflow/core`](https://www.npmjs.com/package/@headflow/core) | Vanilla / custom framework integration |
| [`@headflow/react-ui`](https://www.npmjs.com/package/@headflow/react-ui) | Pre-styled nodes, handles, and edge layer for React |
| [`@headflow/solid`](https://www.npmjs.com/package/@headflow/solid) | SolidJS apps |
| [`@headflow/renderer`](https://www.npmjs.com/package/@headflow/renderer) | Bezier paths & lasso math for SVG |

## License

MIT
