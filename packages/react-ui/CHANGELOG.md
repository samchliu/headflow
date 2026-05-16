# @headflow/react-ui

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

### Patch Changes

- Updated dependencies
  - @headflow/react@0.2.0
