# HeadFlow — Project context for AI agents

## What this project is

**HeadFlow** is a headless node-graph interaction library. It handles interaction logic (dragging nodes, creating edges, lasso selection, coordinate transforms) but has zero opinion on visual styling. Think "React Flow but headless" — bring your own HTML and CSS; the library manages what happens when users interact with it.

## Monorepo layout

```
packages/core/     @headflow/core   — pure TS interaction engine (no framework deps)
packages/solid/    @headflow/solid  — SolidJS adapter (reactive primitives)
packages/react/    @headflow/react  — React adapter (hooks)
apps/demo/         interactive SolidJS demo
apps/demo-react/   interactive React demo
apps/stress-test/  Playwright E2E perf benchmark (100 nodes)
```

Build system: pnpm workspaces + Turborepo. Version management: Changesets.

## Core design decisions

### Attribute-based API
DOM elements become nodes/handles by adding `data-flow-node="id"` and `data-flow-handle="source|target"` + `data-flow-handle-id="id"` attributes. A `MutationObserver` auto-discovers them — framework adapters just need to set attributes on mount.

### Position tracking via style.transform
Nodes are positioned with `style.transform: translate(Xpx, Ypx)`. HeadFlow NEVER uses `top`/`left` for node dragging (avoids layout reflow on every frame). Initial positions can be read from `offsetLeft/offsetTop` or provided explicitly.

### Handle coordinates
Handle screen positions are stored as **canvas-space points** in `HandleEntry.pt` (computed via `getElementCanvasCenter()`). They're updated lazily: on node drag (per `recalcHandlesForNode`) and after transform changes (next rAF via `recalcAllHandles`).

### Edge creation is drag-only
Edges are created by dragging from a `source` handle to a `target` handle. Target handles accept one edge by default; add `data-flow-handle-multiple` to allow many. `allowSelfLoop: false` (default) blocks same-node edges.

### Selection lives in core
`createSelectionManager()` in `packages/core/src/selection.ts` manages the selection `Set<string>`. Both adapters subscribe to `selectionChanged` events. This avoids duplicating logic between SolidJS and React.

### Lasso selection
Drag on empty canvas space starts a lasso. On pointerup, `hitTestNodes()` (O(n) point-in-rect) finds nodes whose canvas-space position falls inside the lasso rect. TODO for Phase 3: replace with quadtree for >2000 nodes.

## Event system

Uses `mitt` for internal pub/sub. Key events:

| Event | When |
|-------|------|
| `nodeAdded` / `nodeRemoved` | MutationObserver or explicit `registerNode` |
| `nodeMoved` | Every pointerup (final position), NOT on every pointermove |
| `edgeCreated` / `edgeDeleted` | Handle drag complete / `removeEdge()` / handle removed |
| `draftEdgeMove` | rAF-throttled during edge drag (for live preview) — carries `sourcePt` + `currentPt` |
| `selectionChanged` | Any selection mutation |
| `lassoUpdate` | rAF-throttled during lasso drag (viewport-space rect) |
| `lassoEnd` | Lasso drag released |

## Known trade-offs

1. **setTransform race condition**: Calling `setTransform()` during an active drag defers `recalcAllHandles` to the next rAF. If a `pointerup` fires before that rAF, edge creation uses handle pts that are one frame stale. Acceptable for Phase 2; document for users who need pixel-perfect edge creation during simultaneous pan.

2. **nodeMoved fires on pointerup only**: Adapters receive final positions, not live positions. This keeps re-renders to O(1) per drag. To track live movement (e.g. for live edge preview), listen to `draftEdgeMove` or read `engine.getEdges()` inside `requestAnimationFrame`.

3. **Group drag**: Moving a selection moves each selected node independently; there is currently no "start-of-drag snapshot" stored, so rapid multi-node drags use the state.startNode position from the primary dragged node, not each node's individual start. Addressed in Phase 3.

4. **Lasso O(n)**: Fine for ≤500 nodes. Phase 3 will add quadtree.

## File tour

```
packages/core/src/
  types.ts          All public interfaces (Point, Rect, Edge, FlowEngine, FlowEvents…)
  engine.ts         createFlow() — wires up all modules, exposes FlowEngine
  selection.ts      createSelectionManager()
  transform.ts      toCanvasSpace / toViewportSpace / getElementCanvasCenter
  drag/
    index.ts        setupDrag() — pointerdown priority logic + rAF throttle
    node.ts         startNodeDrag / processNodeMove / finishNodeDrag
    edge.ts         startEdgeDrag / processEdgeMove / finishEdgeDrag
    lasso.ts        startLassoDrag / processLassoMove / finishLassoDrag / hitTestNodes
    types.ts        DragContext / DragState union types

packages/solid/src/
  context.ts        FlowContext + useFlowContext()
  createFlowCanvas  canvasRef callback + FlowProvider component
  createNode.ts     registerNode on mount, unregisterNode on cleanup
  createHandle.ts   registerHandle on mount, unregisterHandle on cleanup
  createEdges.ts    reactive edges accessor (updates on edgeCreated/edgeDeleted)
  createSelection   createSelection() + createLasso() reactive accessors

packages/react/src/
  context.ts        FlowContext + useFlowContext()
  useFlowCanvas     canvasRef + stable FlowProvider (useMemo)
  useNode.ts        callback ref with register/unregister
  useHandle.ts      callback ref with register/unregister
  useEdges.ts       useSyncExternalStore — re-renders on edge topology changes only
  useSelection.ts   useSyncExternalStore — useSelection() + useLasso()
```

## Build + test commands

```bash
pnpm install                              # install all deps
pnpm --filter @headflow/core build        # build core
pnpm --filter @headflow/solid build       # build solid (depends on core)
pnpm --filter @headflow/react build       # build react (depends on core)
pnpm --filter @headflow/core test         # unit tests (vitest + jsdom)
pnpm --filter @headflow/solid test        # unit tests (vitest + jsdom)
pnpm --filter @headflow/react test        # unit tests (vitest + jsdom)
pnpm --filter @headflow/demo dev          # SolidJS demo dev server
pnpm --filter @headflow/demo-react dev    # React demo dev server
```

## Phase roadmap

### Phase 1 ✅ (shipped)
Core engine, SolidJS adapter, MutationObserver auto-discovery, rAF-throttled drag, edge creation, serialize/restore, CI/CD.

### Phase 2 ✅ (shipped)
React adapter, Selection system (select/deselect/clearSelection/moveSelectionBy), lasso selection, drag.ts refactored into drag/ directory, critical gap fixes (cascade edge delete on handle removal), 19 unit tests.

### Phase 3 (next)
- **Viewport API**: `fitView()`, `panTo(x, y)`, `zoomTo(scale)`, `getViewport()` — pure engine methods
- **Built-in pan/zoom**: `enableBuiltinPanZoom: true` — wheel zoom, two-finger pan
- **Multi-select drag**: Snapshot all selected nodes' start positions at drag begin so each node moves correctly
- **Undo/Redo**: Command pattern (`MoveCommand`, `CreateEdgeCommand`, `DeleteEdgeCommand`)
- **Performance**: Replace O(n) lasso hit test with quadtree for >2000 nodes

### Phase 4 (future)
- Vue 3 adapter
- SSR-safe mode (no DOM access during SSR)
- `@headflow/minimap` helper

## Testing strategy

Unit tests use **Vitest + jsdom** (not browser mode — avoids Playwright setup in CI). `getBoundingClientRect` is mocked in `test-setup.ts` via `data-test-*` attributes to give predictable positions.

E2E perf tests use **Playwright** (in `apps/stress-test/`) with a real browser to measure dropped frames during 100-node drags.

Test files: `packages/*/src/**/*.test.ts(x)`

## Coding conventions

- All canvas-space positions are `{ x, y }` (`Point`). Rects are `{ x, y, w, h }` (`Rect`).
- Internal state uses `Map<string, Entry>` keyed by id strings.
- Handle map key: `"${nodeId}::${handleId}"` — always use this format.
- Events are emitted AFTER state mutation (listeners see consistent state).
- `destroy()` must clear all maps, disconnect observers, and remove all event listeners.
- Adapter callback refs must handle `el = null` (unmount) by calling `unregisterNode/unregisterHandle`.
