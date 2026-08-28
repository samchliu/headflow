# @headflow/core

## 0.2.0

### Minor Changes

- Unify node and edge selection into a single set, add edge click-select (with a generous invisible hit path), shift-click toggle for both nodes and edges, and lasso selection that now hits edges too (straight-line simplification, matching `hitTestNodes`' existing philosophy).

  Add keyboard Delete/Backspace support via new `removeNode()`/`deleteSelection()` engine APIs, batched into a single undo entry per keypress. Since core doesn't own a node's React props/children, node-delete undo is a two-way contract: core auto-restores cascaded edges and selection, and the new `useNodeRemoval()` hook lets the app supply and restore its own node data.

## 0.1.2

### Patch Changes

- docs: README + repository metadata

## 0.1.1

### Patch Changes

- HeadFlow is a **headless** node graph interaction engine: simply drag, connect, select, and transform coordinates; it doesn't determine the visual style. Nodes and join points are marked with `data-flow-*` attributes, allowing integration with the existing DOM.
