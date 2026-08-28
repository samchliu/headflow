# @headflow/react

## 0.3.0

### Minor Changes

- Unify node and edge selection into a single set, add edge click-select (with a generous invisible hit path), shift-click toggle for both nodes and edges, and lasso selection that now hits edges too (straight-line simplification, matching `hitTestNodes`' existing philosophy).

  Add keyboard Delete/Backspace support via new `removeNode()`/`deleteSelection()` engine APIs, batched into a single undo entry per keypress. Since core doesn't own a node's React props/children, node-delete undo is a two-way contract: core auto-restores cascaded edges and selection, and the new `useNodeRemoval()` hook lets the app supply and restore its own node data.

### Patch Changes

- Updated dependencies
  - @headflow/core@0.2.0

## 0.2.0

### Minor Changes

- Add higher-level hooks and styled component package.

  `@headflow/react` gains three new hooks:

  - `useDraftEdge()` — tracks the in-progress edge while the user drags from a source handle
  - `useUndoRedo()` — exposes `undo`, `redo`, and `canUndo`/`canRedo` state
  - `useViewport()` — returns the current canvas transform (scale + translate)

  `@headflow/react-ui` is a new package that ships ready-to-use styled components built on top of `@headflow/react`:

  - `BaseNode` — card-style node shell with selection styles
  - `Handle` — pre-styled connection point
  - `FlowCanvas` — canvas wrapper with optional dot-grid background
  - `EdgeLayer` — SVG layer that renders committed edges as bezier curves
  - `LassoRect` — selection rectangle overlay
  - `tokens` — shared design-token constants

## 0.1.2

### Patch Changes

- docs: README + repository metadata
- Updated dependencies
  - @headflow/core@0.1.2

## 0.1.1

### Patch Changes

- HeadFlow is a **headless** node graph interaction engine: simply drag, connect, select, and transform coordinates; it doesn't determine the visual style. Nodes and join points are marked with `data-flow-*` attributes, allowing integration with the existing DOM.
- Updated dependencies
  - @headflow/core@0.1.1
