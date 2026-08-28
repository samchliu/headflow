# 01 — Edge label rendering component (`EdgeLabels`)

**What to build:** A new `@headflow/react-ui` component, `EdgeLabels`, that lets an app render arbitrary custom content (a badge, keystroke+delay caption, etc.) positioned at each edge's midpoint, and have clicking that content select the edge — exactly like clicking the edge line itself already does.

The app supplies a `renderLabel(edge) => ReactNode` callback. `EdgeLabels` calls it once per live edge (from `useEdges()`), skips edges where it returns `null`/`undefined` entirely (no invisible clickable leftover), and positions the result at the straight-line midpoint of `source.pt`/`target.pt` (bezier curvature intentionally ignored, matching `hitTestEdges`'s existing simplification). The wrapper carries `data-flow-edge={edge.id}` so it flows through the *existing* `pointerdown`-based click/shift-toggle selection logic in `drag/index.ts` with zero changes to `@headflow/core` — the `Edge` type stays untouched, and this is a pure React-layer feature. Draft (in-progress) edges never get a label.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] `EdgeLabels` exported from `@headflow/react-ui`, prop: `renderLabel: (edge: Edge) => ReactNode`, plus `style`/`className` passthrough on the outer layer (consistent with `LassoRect`/`EdgeLayer`'s existing prop conventions)
- [x] Each edge's label wrapper is positioned at `(source.pt + target.pt) / 2`, centered via `transform: translate(-50%, -50%)`, rendered inside the same canvas-space transformed layer as `EdgeLayer` (so it pans/zooms in sync automatically) — midpoint math extracted as `edgeMidpoint` in `@headflow/renderer`, test-driven (`midpoint.test.ts`)
- [x] Label wrapper has `data-flow-edge={edge.id}` and pointer-events enabled (the outer layer itself stays `pointer-events: none` so empty canvas space still passes clicks through to lasso/canvas-deselect, matching `EdgeLayer`'s pattern)
- [x] `renderLabel` returning `null`/`undefined`/`false` skips rendering the wrapper for that edge entirely — no leftover invisible clickable div
- [x] No label is ever rendered for the in-progress draft edge (`useDraftEdge()`) — `EdgeLabels` never reads `useDraftEdge()` at all
- [x] Zero changes to `@headflow/core` (no `Edge.label` field, no core module touched)
- [x] Verified via the Storybook recipe in ticket 02 (react-ui has no test runner today — `BaseNode`/`EdgeLayer`/`LassoRect` are unit-test-free too, so this follows existing convention rather than introducing new test infra)
