# @headflow/core

**Headless node-graph interaction engine** — pure TypeScript, framework-agnostic. You own all markup and styling; HeadFlow handles drag, edges, selection, viewport math, and coordinates via a small **attribute-based DOM API**.

Runtime dependency: **`mitt`** only.

---

## Why HeadFlow?

| You get | You don’t get |
|--------|----------------|
| Draggable nodes, multi-select + group drag | Premade node chrome or themes |
| Edge creation (source → target handles) | SVG/React components forced on you |
| Lasso + Shift-modifier selection | Layout algorithms |
| Optional pan/zoom + `fitView` / `panTo` / `zoomTo` | Data fetching or state backends |
| Undo/redo for moves and edge ops | Opinions on how edges look |
| `serialize` / `restore` for graph snapshots | |

---

## Install

```bash
npm install @headflow/core
```

---

## Attribute API

Inside your **canvas container**, mark DOM nodes with:

| Attribute | Value | Purpose |
|-----------|--------|---------|
| `data-flow-node` | Node id | Makes the element a draggable node |
| `data-flow-handle` | `source` \| `target` | Connection endpoint |
| `data-flow-handle-id` | string | Unique handle id within the node |
| `data-flow-handle-multiple` | _(present)_ | Allow multiple edges into one target handle |

`MutationObserver` discovers nodes and handles as you add or change the DOM — no manual registry required for static trees.

---

## Quick start (vanilla)

```ts
import { createFlow } from '@headflow/core'

const container = document.getElementById('canvas')!
const flow = createFlow({ container })

flow.on('edgeCreated', ({ edge }) => console.log('edge', edge))
flow.on('nodeMoved', ({ nodeId, position }) => console.log(nodeId, position))

// Tear down when unmounting
flow.destroy()
```

Wire your HTML with `data-flow-*` attributes on elements inside `container`, or build them dynamically — the engine picks them up.

---

## Engine highlights

- **Events** — `nodeAdded`, `nodeRemoved`, `nodeMoved`, `edgeCreated`, `edgeDeleted`, `draftEdgeMove`, `selectionChanged`, `lassoUpdate`, `lassoEnd`, `viewportChanged`, and more (see types `FlowEvents`).
- **State** — `getEdges()`, `getSelection()`, `serialize()` → `SerializedGraph`, `restore(state)`.
- **Viewport** — `getViewport()`, `setTransform(...)`, `fitView`, `panTo`, `zoomTo` (when configured).
- **Mutations** — `setNodePosition`, `removeEdge`, `selectNode(s)`, `clearSelection`, `moveSelectionBy`, etc.

Full event and method lists live in the repo: **[Documentation → Engine API](https://github.com/samchliu/headflow#engine-api)**.

---

## Related packages

| Package | Role |
|---------|------|
| [`@headflow/react`](https://www.npmjs.com/package/@headflow/react) | React hooks (`useNode`, `useEdges`, …) |
| [`@headflow/solid`](https://www.npmjs.com/package/@headflow/solid) | Solid primitives (`createNode`, `createEdges`, …) |
| [`@headflow/renderer`](https://www.npmjs.com/package/@headflow/renderer) | Bezier / lasso math helpers for SVG |

---

## Links

- **Repository & full docs:** [github.com/samchliu/headflow](https://github.com/samchliu/headflow)
- **Issues:** [github.com/samchliu/headflow/issues](https://github.com/samchliu/headflow/issues)

## License

MIT
