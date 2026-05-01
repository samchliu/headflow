/**
 * Interaction fixture for Playwright E2E tests.
 *
 * Uses the Vanilla (attribute-based) API so the engine instance is directly
 * accessible on `window.__hf` without any adapter indirection.
 *
 * Fixed node layout:
 *
 *  ┌────────┐         ┌────────┐         ┌────────┐
 *  │ Node A │──out──▶ │ Node B │──out──▶ │ Node C │
 *  └────────┘         └────────┘         └────────┘
 *      x=80               x=300              x=520
 *      y=100              y=100              y=100
 *
 *  ┌────────┐
 *  │ Node D │  (no handles — for lasso-only selection)
 *  └────────┘
 *      x=80, y=300
 */

import { createSignal, onMount, onCleanup } from 'solid-js'
import { createFlow } from '@headflow/core'
import type { FlowEngine } from '@headflow/core'

declare global {
  interface Window {
    /** HeadFlow engine exposed for Playwright assertions. */
    __hf: FlowEngine
  }
}

// ── Shared node style ─────────────────────────────────────────────────────────

const nodeStyle = (selected: boolean): Record<string, string> => ({
  position: 'absolute',
  top: '0',
  left: '0',
  width: '120px',
  height: '44px',
  background: selected ? '#1e1b4b' : '#1c1c1c',
  border: `2px solid ${selected ? '#6366f1' : '#333'}`,
  borderRadius: '8px',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'font-family': 'system-ui, sans-serif',
  'font-size': '13px',
  color: '#e5e5e5',
  cursor: 'grab',
  'user-select': 'none',
})

const sourceHandleStyle: Record<string, string> = {
  position: 'absolute',
  right: '-7px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '14px',
  height: '14px',
  'border-radius': '50%',
  background: '#10b981',
  border: '2px solid #0f0f0f',
  cursor: 'crosshair',
}

const targetHandleStyle: Record<string, string> = {
  position: 'absolute',
  left: '-7px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '14px',
  height: '14px',
  'border-radius': '50%',
  background: '#6366f1',
  border: '2px solid #0f0f0f',
  cursor: 'crosshair',
}

// ── App ───────────────────────────────────────────────────────────────────────

export function InteractionApp() {
  let containerEl!: HTMLDivElement
  const [selected, setSelected] = createSignal<Set<string>>(new Set())

  onMount(() => {
    const engine = createFlow({ container: containerEl, allowSelfLoop: false })

    // Expose for Playwright assertions
    window.__hf = engine

    engine.on('selectionChanged', ({ selected: sel }) => {
      setSelected(new Set(sel))
    })

    onCleanup(() => {
      engine.destroy()
    })
  })

  const isSel = (id: string) => selected().has(id)

  return (
    <div
      ref={containerEl}
      id="canvas"
      data-testid="canvas"
      style={{
        position: 'relative',
        width: '800px',
        height: '600px',
        background: '#111',
        overflow: 'hidden',
      }}
    >
      {/* ── Node A: source only ────────────────────────────── */}
      <div
        id="nodeA"
        data-flow-node="nodeA"
        style={{ ...nodeStyle(isSel('nodeA')), transform: 'translate(80px, 100px)' }}
      >
        Node A
        <div
          data-flow-handle="source"
          data-flow-handle-id="out"
          data-testid="nodeA-out"
          style={sourceHandleStyle}
        />
      </div>

      {/* ── Node B: target + source ────────────────────────── */}
      <div
        id="nodeB"
        data-flow-node="nodeB"
        style={{ ...nodeStyle(isSel('nodeB')), transform: 'translate(300px, 100px)' }}
      >
        <div
          data-flow-handle="target"
          data-flow-handle-id="in"
          data-testid="nodeB-in"
          style={targetHandleStyle}
        />
        Node B
        <div
          data-flow-handle="source"
          data-flow-handle-id="out"
          data-testid="nodeB-out"
          style={sourceHandleStyle}
        />
      </div>

      {/* ── Node C: target only ────────────────────────────── */}
      <div
        id="nodeC"
        data-flow-node="nodeC"
        style={{ ...nodeStyle(isSel('nodeC')), transform: 'translate(520px, 100px)' }}
      >
        <div
          data-flow-handle="target"
          data-flow-handle-id="in"
          data-testid="nodeC-in"
          style={targetHandleStyle}
        />
        Node C
      </div>

      {/* ── Node D: no handles (lasso target) ──────────────── */}
      <div
        id="nodeD"
        data-flow-node="nodeD"
        style={{ ...nodeStyle(isSel('nodeD')), transform: 'translate(80px, 300px)' }}
      >
        Node D
      </div>

      {/* ── Status bar — readable by tests ─────────────────── */}
      <div
        id="status"
        data-testid="status"
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          'font-size': '11px',
          'font-family': 'monospace',
          color: '#555',
        }}
      >
        HeadFlow interaction fixture
      </div>
    </div>
  )
}
