# @headflow/renderer

## 0.2.0

### Minor Changes

- Add `EdgeLabels`, a render-prop component (`renderLabel(edge) => ReactNode`) that positions arbitrary custom content at each edge's midpoint. The label wrapper reuses the existing click-select mechanism (shift-toggle included) with zero changes to `@headflow/core` — label content is fully app-owned data.

  Add `edgeMidpoint` to `@headflow/renderer`.

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
