# @headflow/renderer

Small **drawing helpers** for apps built with HeadFlow (`@headflow/core`). Use them to generate SVG paths, normalize selection rectangles, or align overlays — **no** opinion on React/Solid/DOM structure beyond math + strings.

**Peer:** `@headflow/core` (keep versions aligned with your app).

---

## Exports

| Export | Purpose |
|--------|---------|
| **`bezierPath`** | Build an SVG path for a curved edge between two points (e.g. cubic-bezier style connectors) |
| **`normalizeLassoRect`** | Normalize a drag rectangle so `x/y` are top-left and `w/h` are positive — handy for lasso overlays |

The package also re-exports shared **`Point`** type from `@headflow/core`.

---

## Install

```bash
npm install @headflow/renderer @headflow/core
```

---

## Usage sketch

```ts
import { bezierPath, normalizeLassoRect } from '@headflow/renderer'

// Curved edge in SVG
const d = bezierPath(
  { x: 0, y: 0 },
  { x: 200, y: 100 }
)
// → use as <path d={d} />

// Lasso box from pointer drag (may have negative width/height)
const rect = normalizeLassoRect({ x: 10, y: 10, w: -50, h: -30 })
// → { x, y, w, h } with positive w/h
```

Pair with **`useEdges()`** (React) or **`createEdges()`** (Solid) for live anchor positions, then render `<path>` or `<rect>` in your own layer.

---

## When to use this package

- You want **Bezier-style** edges instead of straight `<line>` segments.
- You draw a **lasso** or marquee and need a consistent **screen-space rect** for hit-testing or styling.

For interaction, selection, and graph state, use **`@headflow/core`** (or React/Solid adapters).

---

## Links

- **Main project & docs:** [github.com/samchliu/headflow](https://github.com/samchliu/headflow)
- **Issues:** [github.com/samchliu/headflow/issues](https://github.com/samchliu/headflow/issues)

## Related

| Package | Role |
|---------|------|
| [`@headflow/core`](https://www.npmjs.com/package/@headflow/core) | Engine |
| [`@headflow/react`](https://www.npmjs.com/package/@headflow/react) | React hooks |
| [`@headflow/solid`](https://www.npmjs.com/package/@headflow/solid) | Solid primitives |

## License

MIT
