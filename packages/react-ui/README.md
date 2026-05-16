# @headflow/react-ui

Pre-styled React components for **[HeadFlow](https://github.com/samchliu/headflow)** — drop-in nodes, handles, edge layers, and design tokens that get you to a working flow canvas in minutes while staying fully overridable.

**Requirements:** React **18+**, `@headflow/react` **0.2+**.

---

## What you get

| Component | Description |
|-----------|-------------|
| **`<FlowCanvas>`** | Full-size canvas container with a dot-grid background and built-in viewport transform. Must be inside a `<FlowProvider>`. |
| **`<BaseNode>`** | Card-style node shell (border-top accent, selection ring, grab cursor). Pass `<Handle>` components as children. |
| **`<Handle>`** | Circular handle dot. Positions itself on any edge of the parent node (`left`, `right`, `top`, `bottom`). |
| **`<EdgeLayer>`** | SVG overlay that renders all committed edges as bezier curves. |
| **`<LassoRect>`** | Animated selection rectangle shown during lasso drag. |
| **`tokens`** | Design-token constants (`tokens.accent`, `tokens.bgCanvas`, etc.) for consistent styling in custom nodes. |

---

## Install

```bash
npm install @headflow/react-ui @headflow/react @headflow/core
```

Peers: `react`, `react-dom` (>=18).

---

## Minimal example

```tsx
import { useFlowCanvas } from '@headflow/react'
import { FlowCanvas, BaseNode, Handle, EdgeLayer } from '@headflow/react-ui'

export function App() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })

  return (
    <FlowProvider>
      <FlowCanvas canvasRef={canvasRef}>
        <MyNode id="n1" defaultPosition={{ x: 60, y: 100 }} />
        <MyNode id="n2" defaultPosition={{ x: 300, y: 100 }} />
        <EdgeLayer />
      </FlowCanvas>
    </FlowProvider>
  )
}

function MyNode({ id, defaultPosition }: { id: string; defaultPosition: { x: number; y: number } }) {
  return (
    <BaseNode nodeId={id} defaultPosition={defaultPosition}>
      <Handle nodeId={id} handleId="in"  type="target" position="left" />
      My node
      <Handle nodeId={id} handleId="out" type="source" position="right" />
    </BaseNode>
  )
}
```

---

## Component reference

### `<FlowCanvas>`

```tsx
<FlowCanvas canvasRef={canvasRef} style={{ height: 600 }}>
  {/* nodes, edge layer, lasso rect */}
</FlowCanvas>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `canvasRef` | `(el: HTMLElement \| null) => void` | — | Ref from `useFlowCanvas()` — required |
| `style` | `CSSProperties` | — | Override outer container styles |
| `className` | `string` | — | Extra class names |

### `<BaseNode>`

```tsx
<BaseNode nodeId="n1" defaultPosition={{ x: 60, y: 100 }} accent="#10b981" width={160}>
  <Handle nodeId="n1" handleId="in" type="target" position="left" />
  Label
  <Handle nodeId="n1" handleId="out" type="source" position="right" />
</BaseNode>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodeId` | `string` | — | Must match the engine node ID |
| `defaultPosition` | `{ x: number; y: number }` | — | Initial canvas position |
| `accent` | `string` | `tokens.accent` | Top-border accent colour |
| `width` | `number` | `140` | Node width in pixels |
| `style` | `CSSProperties` | — | Extra inline styles |
| `className` | `string` | — | Extra class names |

### `<Handle>`

```tsx
<Handle nodeId="n1" handleId="out" type="source" position="right" color="#10b981" size={14} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodeId` | `string` | — | Parent node ID |
| `handleId` | `string` | — | Unique handle ID within the node |
| `type` | `"source" \| "target"` | — | Connection direction |
| `position` | `"left" \| "right" \| "top" \| "bottom"` | — | Edge of the node to attach to |
| `color` | `string` | accent / accentAlt | Fill colour of the dot |
| `size` | `number` | `14` | Dot diameter in pixels |

### `<EdgeLayer>`

```tsx
<EdgeLayer strokeWidth={2} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `strokeWidth` | `number` | `1.5` | Edge stroke width |
| `stroke` | `string` | `tokens.edge` | Edge stroke colour |

### `<LassoRect>`

No required props. Renders the animated selection rectangle; hide it by not mounting the component.

### `tokens`

```tsx
import { tokens } from '@headflow/react-ui'

tokens.accent     // '#6366f1'
tokens.bgCanvas   // '#0d0d0d'
tokens.edge       // '#818cf8'
// … see source for full list
```

---

## Documentation

- **Full quick start, attribute table, gestures, monorepo layout:**  
  [github.com/samchliu/headflow](https://github.com/samchliu/headflow)
- **Issues:** [github.com/samchliu/headflow/issues](https://github.com/samchliu/headflow/issues)

---

## See also

| Package | Use case |
|---------|----------|
| [`@headflow/react`](https://www.npmjs.com/package/@headflow/react) | Hooks only — full control over styling |
| [`@headflow/core`](https://www.npmjs.com/package/@headflow/core) | Vanilla / custom framework integration |
| [`@headflow/solid`](https://www.npmjs.com/package/@headflow/solid) | SolidJS apps |
| [`@headflow/renderer`](https://www.npmjs.com/package/@headflow/renderer) | Bezier paths & lasso math for SVG |

## License

MIT
