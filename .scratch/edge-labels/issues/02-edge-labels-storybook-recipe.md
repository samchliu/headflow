# 02 — Storybook recipe for edge labels

**What to build:** A new Recipes/React Storybook story demonstrating `EdgeLabels` in a realistic scenario — non-trivial custom label content (not just plain text), click-to-select on the label, and shift-toggle multi-select spanning nodes/edges/labels together — following the same shape as the existing `react-edge-selection` and `react-delete-selection` recipes (pre-wired edges via `engine.restore()` on mount, a toolbar with a live selection readout, a `docs.description` with Why/APIs/Try-this sections).

The description must call out the `pointerdown`-vs-`click` `stopPropagation()` gotcha for anyone putting interactive content (e.g. a delete button) inside a label.

**Blocked by:** 01 — Edge label rendering component (`EdgeLabels`)

**Status:** ready-for-agent

- [x] New story file under `apps/stories/src/recipes/` using `<EdgeLabels renderLabel={...} />` alongside `<EdgeLayer />` inside `<FlowCanvas>` (`react-edge-labels.stories.tsx`)
- [x] `renderLabel` renders non-trivial content (a pill showing per-edge keystroke+delay metadata plus a delete button), not just a bare string, to actually exercise the "arbitrary ReactNode" capability
- [x] Clicking a label selects/toggles its edge exactly like clicking the edge line does (demonstrated via the same `useSelection()` status readout pattern used in `react-edge-selection.stories.tsx`)
- [x] `docs.description` explains why labels are a render-prop (app owns the content/data), and documents the `pointerdown`-vs-`click` `stopPropagation()` caveat for interactive label content — demonstrated live via the pill's ✕ delete button, which opts out via `onPointerDown`
- [x] `tsc --noEmit` on the stories app and `storybook build` both succeed with the new story included
