# @headflow/stories

Interactive Storybook examples for the **HeadFlow** packages. Every recipe is a self-contained, copy-paste-ready demo that shows a realistic use-case built with `@headflow/react` and `@headflow/react-ui`.

Live deployment: [headflow stories on GitHub Pages](https://samchliu.github.io/headflow/)

---

## Running locally

```bash
# from the repo root
pnpm install
pnpm --filter=@headflow/stories dev
```

Opens Storybook at <http://localhost:6006>.

---

## Recipes

| Story | What it demonstrates |
|-------|----------------------|
| **Grouped Workflow** | Container node whose children follow it when dragged — ~15 lines using `engine.on("nodeMoved")` + `setNodePosition` |
| **Port Capacity Limits** | Live-adjustable per-handle connection caps enforced via `edgeCreated` + `removeEdge` |
| **Undo / Redo** | Keyboard and button undo/redo using `useUndoRedo()` |
| **Pan/Zoom Viewport** | Built-in pan/zoom with viewport readout via `useViewport()` |
| **Persist & Restore** | Serialize the graph to JSON and restore it with `engine.serialize()` / `engine.restore()` |
| **Readonly Review Mode** | Toggle a read-only overlay that blocks all edits without unmounting the canvas |
| **Conditional Branching** | Edges that carry a condition label; branch nodes that enforce exactly one true/false output |
| **Connection Rules Lab** | Whitelist-based connection rules enforced at the port level |
| **Custom Handle Positioning** | Handles placed at arbitrary positions on a node using pixel offsets |
| **Nested Node Handles** | Deeply nested DOM elements used as handles via `useHandle` |
| **Validation Before Publish** | Validate graph structure before committing; highlight invalid edges |

---

## Stack

- [Storybook 8](https://storybook.js.org/) with Vite
- React 18
- `@headflow/react` + `@headflow/react-ui`

## License

MIT
