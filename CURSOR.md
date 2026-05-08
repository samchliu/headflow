# HeadFlow — Project context for AI agents

## What this project is

**HeadFlow** is a headless node-graph interaction library. It handles interaction logic (dragging nodes, creating edges, lasso selection, coordinate transforms) but has zero opinion on visual styling. Think "React Flow but headless" — bring your own HTML and CSS; the library manages what happens when users interact with it.

## Monorepo layout

```
packages/core/     @headflow/core   — pure TS interaction engine (no framework deps)
packages/solid/    @headflow/solid  — SolidJS adapter (reactive primitives)
packages/react/    @headflow/react  — React adapter (hooks)
packages/renderer/ @headflow/renderer — renderer math utilities (bezier/lasso normalize)
apps/stories/      Storybook stories (renderer utilities + React canvas)
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
  types.ts          All public interfaces (Point, Rect, Edge, FitViewOptions, FlowEngine, FlowEvents…)
  engine.ts         createFlow() — wires up all modules, exposes FlowEngine
  selection.ts      createSelectionManager()
  history.ts        createHistoryManager() — command-pattern undo/redo
  panzoom.ts        setupPanZoom() — built-in wheel/pinch pan/zoom (optional)
  transform.ts      toCanvasSpace / toViewportSpace / getElementCanvasCenter
  drag/
    index.ts        setupDrag() — pointerdown priority logic + rAF throttle
    node.ts         startNodeDrag / processNodeMove / finishNodeDrag (group drag + history)
    edge.ts         startEdgeDrag / processEdgeMove / finishEdgeDrag (history on create)
    lasso.ts        startLassoDrag / processLassoMove / finishLassoDrag / hitTestNodes
    types.ts        DragContext (incl. history?) / DragState union types

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
```

## Phase roadmap

### Phase 1 ✅ (shipped)
Core engine, SolidJS adapter, MutationObserver auto-discovery, rAF-throttled drag, edge creation, serialize/restore, CI/CD.

### Phase 2 ✅ (shipped)
React adapter, Selection system (select/deselect/clearSelection/moveSelectionBy), lasso selection, drag.ts refactored into drag/ directory, critical gap fixes (cascade edge delete on handle removal), 19 unit tests.

### Phase 3 ✅ (shipped)
- **E2E tests** (Phase 2E): Playwright interaction fixture (`apps/stress-test/interaction.html`) + 22 interaction E2E tests covering node drag, edge creation/cancel/cascade, lasso selection, and Shift+lasso append.
- **Viewport API**: `getViewport()`, `fitView(opts?)`, `panTo(x, y)`, `zoomTo(scale, anchor?)` — implemented in `engine.ts`. `viewportChanged` event emitted on any transform change.
- **Built-in pan/zoom**: `enableBuiltinPanZoom: true` — implemented in `panzoom.ts`. Wheel → pan; Ctrl/Cmd+wheel → zoom anchored at pointer.
- **Multi-select drag fix**: `drag/node.ts` now snapshots all selected nodes' positions at drag start (`selectionSnapshot`) so group drag is always relative to each node's individual start position.
- **Undo/Redo**: Command pattern in `history.ts` (`createHistoryManager`). Node drag, `moveSelectionBy`, `removeEdge`, and edge creation via drag are all recorded. `engine.undo()`, `engine.redo()`, `engine.canUndo()`, `engine.canRedo()`.

### Phase 4 (next)
- **`@headflow/renderer`**: Pure-math utility package — `bezierPath(source, target)` → SVG path string, `normalizeLassoRect(rect)` → `{ x, y, w, h }`. Framework-agnostic. Resolves `bezier.ts` duplication in both demos.
- **`apps/stories/`**: Storybook (`@storybook/react-vite`) for renderer utility stories + full React canvas story.
- **Demo redesign** (design review decisions — see below): Unified dark theme, Geist Sans/Mono font, floating HUD for Phase 3 controls.
- **Demo feature parity**: SolidJS demo brought to feature parity with React demo (draft edge, selection highlight, lasso overlay).

### Phase 5 (future)
- **Performance**: Replace O(n) lasso hit test with quadtree for >2000 nodes
- Vue 3 adapter
- SSR-safe mode (no DOM access during SSR)
- `@headflow/minimap` helper

## Demo Design System (Phase 4)

Decisions from `/plan-design-review` on 2026-05-01.

### Theme: Unified Dark

| Token | Value | Usage |
|---|---|---|
| `--hf-bg-canvas` | `#0d0d0d` | Canvas background |
| `--hf-bg-surface` | `#141414` | Node card background |
| `--hf-bg-header` | `#111111` | Header background |
| `--hf-border-default` | `#262626` | Default node border, header bottom border |
| `--hf-border-accent` | `#6366f1` | Selected node border, lasso border |
| `--hf-text-primary` | `#f0f0f0` | Primary text |
| `--hf-text-muted` | `#666` | Secondary/hint text |
| `--hf-accent` | `#6366f1` | Indigo — target handle, selected state, draft edge |
| `--hf-accent-alt` | `#10b981` | Green — source handle |
| `--hf-edge-color` | `#818cf8` | Edge stroke (high contrast on dark bg) |
| `--hf-dot-color` | `#2a2a2a` | Canvas dot grid (24px pitch) |

### Typography
- Font: **Geist Sans** for UI text, **Geist Mono** for node labels
- Load via: `@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap')` (or local CDN)
- Sizes: header title 15px/600, node label 13px/500, hint text 12px/400

### Layout
```
┌──────────────────────────────────────────────────┐
│  [●] HeadFlow  [React]    Drag · Connect · Lasso │  ← Header: #111, border-bottom: #262626
├──────────────────────────────────────────────────┤
│                                                  │
│   Canvas (#0d0d0d, dot grid #2a2a2a/24px)        │
│                                                  │
│   ┌──────────────┐    ┌──────────────┐           │
│   │ ●  Input  ○  │───▶│ ●  Output ○  │           │
│   └──────────────┘    └──────────────┘           │
│                                                  │
│  ┌──────────────────────┐                        │
│  │ ↩ ↪  Fit  ──●── 100% │  ← Floating HUD (BL)  │
│  └──────────────────────┘                        │
└──────────────────────────────────────────────────┘
```

### Interaction States

| Feature | Default | Hover | Selected | Active/Draft |
|---|---|---|---|---|
| Node card | bg `#141414`, border `#262626` | border `#3a3a3a`, shadow `0 4px 16px #0008` | border `#6366f1`, bg `#1a1836`, shadow `0 0 0 2px #6366f133` | (same as hover) |
| Source handle | `#10b981` circle, 14×14 | scale 1.2, glow `0 0 0 3px #10b98133` | — | `0 0 0 4px #10b98166` |
| Target handle | `#6366f1` circle, 14×14 | scale 1.2, glow `0 0 0 3px #6366f133` | — | `0 0 0 4px #6366f166` (hover target during edge drag) |
| Edge | stroke `#818cf8`, width 1.5 | stroke `#a5b4fc`, width 2 | — | dashed `#6366f1`, animated dash (draft) |
| Lasso | `border: 1.5px dashed #6366f1`, bg `rgba(99,102,241,0.07)` | — | — | — |

### Node Type Differentiation
Each node type gets a **4px top border** accent (not left border — avoids AI slop pattern):
- Input node: `border-top: 4px solid #10b981` (green)
- Transform node: `border-top: 4px solid #6366f1` (indigo)
- Output node: `border-top: 4px solid #f59e0b` (amber)

### Phase 3 Floating HUD
Position: `position: absolute; bottom: 20px; left: 20px`. Contains:
- Undo button (`↩`, disabled when `!canUndo`)
- Redo button (`↪`, disabled when `!canRedo`)
- FitView button (⊡ icon)
- Zoom slider (`input[type=range]`, 0.1–2×, step 0.05) + percentage label

### Header
- No gradient. `background: #111; border-bottom: 1px solid #262626`.
- Left: `●` dot (6px, `#6366f1`) + `HeadFlow` (15px/600) + badge (`React Demo` / `Solid Demo`)
- Right: static hint text (12px, `#555`): `Drag nodes · Connect handles · Shift+drag lasso`

### Accessibility
- All handles: `aria-label="Input handle"` / `aria-label="Output handle"`
- All nodes: `role="button"` + `aria-label="${label} node"`
- Canvas container: `role="application"` + `aria-label="Flow canvas"`
- Hint text contrast: min 4.5:1 (use `#888` at minimum on `#111` bg)

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
