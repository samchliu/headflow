import { type Component, createSignal, For, onCleanup, onMount } from 'solid-js'
import {
  createLasso,
  createEdges,
  createFlowCanvas,
  createHandle,
  createNode,
  createSelection,
  type Edge,
  type Point,
} from '@headflow/solid'
import { useFlowContext } from '@headflow/solid'
import { bezierPath, normalizeLassoRect } from '@headflow/renderer'

const TOKENS = {
  canvasBg: '#0d0d0d',
  surfaceBg: '#141414',
  headerBg: '#111111',
  borderDefault: '#262626',
  borderAccent: '#6366f1',
  textPrimary: '#f0f0f0',
  textMuted: '#8a8a8a',
  accent: '#6366f1',
  accentAlt: '#10b981',
  edge: '#818cf8',
  dot: '#2a2a2a',
} as const

// ── Data ────────────────────────────────────────────────────────────────────

interface NodeData {
  id: string
  label: string
  kind: 'input' | 'transform' | 'output'
  defaultPosition: Point
}

const NODES: NodeData[] = [
  { id: 'input', label: 'Input Source', kind: 'input', defaultPosition: { x: 60, y: 160 } },
  { id: 'process', label: 'Transform A', kind: 'transform', defaultPosition: { x: 280, y: 100 } },
  { id: 'filter', label: 'Transform B', kind: 'transform', defaultPosition: { x: 280, y: 240 } },
  { id: 'output', label: 'Output Sink', kind: 'output', defaultPosition: { x: 520, y: 170 } },
]

// ── Node component ───────────────────────────────────────────────────────────

const FlowNode: Component<{ data: NodeData }> = (props) => {
  const selected = createSelection()
  const { ref: nodeRef } = createNode(props.data.id, {
    defaultPosition: props.data.defaultPosition,
  })
  const { ref: targetRef } = createHandle({
    id: 'in',
    type: 'target',
    nodeId: props.data.id,
  })
  const { ref: sourceRef } = createHandle({
    id: 'out',
    type: 'source',
    nodeId: props.data.id,
  })
  const topAccent =
    props.data.kind === 'input'
      ? '#10b981'
      : props.data.kind === 'output'
        ? '#f59e0b'
        : '#6366f1'
  const isSelected = () => selected().has(props.data.id)

  return (
    <div
      ref={nodeRef}
      role="button"
      aria-label={`${props.data.label} node`}
      style={{
        position: 'absolute',
        display: 'flex',
        'align-items': 'center',
        gap: '10px',
        background: isSelected() ? '#1a1836' : TOKENS.surfaceBg,
        border: `1.5px solid ${isSelected() ? TOKENS.borderAccent : TOKENS.borderDefault}`,
        'border-top': `4px solid ${topAccent}`,
        'border-radius': '8px',
        padding: '10px 14px',
        cursor: 'grab',
        'box-shadow': isSelected() ? '0 0 0 2px #6366f133' : '0 4px 16px #0008',
        'user-select': 'none',
        'min-width': '130px',
        'font-size': '13px',
        'font-weight': '500',
        color: TOKENS.textPrimary,
        'font-family': 'Geist Mono, ui-monospace, monospace',
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Target handle (input port — left) */}
      <div
        ref={targetRef}
        data-flow-handle="target"
        data-flow-handle-id="in"
        aria-label="Input handle"
        style={{
          width: '14px',
          height: '14px',
          'border-radius': '50%',
          background: TOKENS.accent,
          'border': `2px solid ${TOKENS.canvasBg}`,
          'box-shadow': '0 0 0 3px #6366f133',
          cursor: 'crosshair',
          'flex-shrink': '0',
        }}
      />

      <span style={{ flex: 1, 'text-align': 'center' }}>{props.data.label}</span>

      {/* Source handle (output port — right) */}
      <div
        ref={sourceRef}
        data-flow-handle="source"
        data-flow-handle-id="out"
        aria-label="Output handle"
        style={{
          width: '14px',
          height: '14px',
          'border-radius': '50%',
          background: TOKENS.accentAlt,
          'border': `2px solid ${TOKENS.canvasBg}`,
          'box-shadow': '0 0 0 3px #10b98133',
          cursor: 'crosshair',
          'flex-shrink': '0',
        }}
      />
    </div>
  )
}

// ── Edge SVG layer ────────────────────────────────────────────────────────────

const EdgeLayer: Component = () => {
  const { getEngine } = useFlowContext()
  const edges = createEdges()
  const [draft, setDraft] = createSignal<{
    sourceX: number
    sourceY: number
    currentX: number
    currentY: number
  } | null>(null)

  onMount(() => {
    const engine = getEngine()
    const onMove = ({
      sourcePt,
      currentPt,
    }: {
      sourcePt: { x: number; y: number }
      currentPt: { x: number; y: number }
    }) => {
      setDraft({
        sourceX: sourcePt.x,
        sourceY: sourcePt.y,
        currentX: currentPt.x,
        currentY: currentPt.y,
      })
    }
    const onCancel = () => setDraft(null)

    engine.on('draftEdgeMove', onMove)
    engine.on('edgeCreateCancelled', onCancel)
    engine.on('edgeCreated', onCancel)
    onCleanup(() => {
      engine.off('draftEdgeMove', onMove)
      engine.off('edgeCreateCancelled', onCancel)
      engine.off('edgeCreated', onCancel)
    })
  })

  return (
    <svg
      style={{
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        'pointer-events': 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={TOKENS.edge} />
        </marker>
      </defs>
      <For each={edges()}>
        {(edge: Edge) => (
          <path
            d={bezierPath(edge.source.pt, edge.target.pt)}
            fill="none"
            stroke={TOKENS.edge}
            stroke-width="1.5"
            stroke-linecap="round"
            marker-end="url(#arrow)"
          />
        )}
      </For>
      {draft() && (
        <path
          d={bezierPath(
            { x: draft()!.sourceX, y: draft()!.sourceY },
            { x: draft()!.currentX, y: draft()!.currentY },
          )}
          fill="none"
          stroke={TOKENS.accent}
          stroke-width="2"
          stroke-dasharray="6 5"
        />
      )}
    </svg>
  )
}

const LassoOverlay: Component = () => {
  const lasso = createLasso()
  return (
    <For each={lasso() ? [normalizeLassoRect(lasso()!)] : []}>
      {(rect) =>
        rect.w >= 4 || rect.h >= 4 ? (
          <div
            style={{
              position: 'absolute',
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${rect.w}px`,
              height: `${rect.h}px`,
              border: `1.5px dashed ${TOKENS.accent}`,
              background: 'rgba(99,102,241,0.07)',
              'border-radius': '4px',
              'pointer-events': 'none',
            }}
          />
        ) : null
      }
    </For>
  )
}

const Hud: Component = () => {
  const { getEngine } = useFlowContext()
  const [canUndo, setCanUndo] = createSignal(false)
  const [canRedo, setCanRedo] = createSignal(false)
  const [zoom, setZoom] = createSignal(1)
  const [hasViewportApi, setHasViewportApi] = createSignal(true)

  onMount(() => {
    const engine = getEngine()
    const hasHistoryApi =
      typeof (engine as { canUndo?: unknown }).canUndo === 'function' &&
      typeof (engine as { canRedo?: unknown }).canRedo === 'function' &&
      typeof (engine as { undo?: unknown }).undo === 'function' &&
      typeof (engine as { redo?: unknown }).redo === 'function'
    const hasViewport =
      typeof (engine as { getViewport?: unknown }).getViewport === 'function' &&
      typeof (engine as { zoomTo?: unknown }).zoomTo === 'function' &&
      typeof (engine as { fitView?: unknown }).fitView === 'function'

    const sync = () => {
      setCanUndo(hasHistoryApi ? engine.canUndo() : false)
      setCanRedo(hasHistoryApi ? engine.canRedo() : false)
      setHasViewportApi(hasViewport)
      setZoom(hasViewport ? engine.getViewport().scale : 1)
    }
    sync()
    engine.on('viewportChanged', sync)
    engine.on('nodeMoved', sync)
    engine.on('edgeCreated', sync)
    engine.on('edgeDeleted', sync)
    engine.on('selectionChanged', sync)
    onCleanup(() => {
      engine.off('viewportChanged', sync)
      engine.off('nodeMoved', sync)
      engine.off('edgeCreated', sync)
      engine.off('edgeDeleted', sync)
      engine.off('selectionChanged', sync)
    })
  })

  return (
    <div
      style={{
        position: 'absolute',
        left: '20px',
        bottom: '20px',
        display: 'flex',
        'align-items': 'center',
        gap: '8px',
        padding: '10px 12px',
        'border-radius': '10px',
        border: `1px solid ${TOKENS.borderDefault}`,
        background: '#0f0f0fcc',
        'backdrop-filter': 'blur(8px)',
      }}
    >
      <button
        style={hudButtonStyle}
        disabled={!canUndo()}
        onClick={() => {
          const current = getEngine() as { undo?: () => void }
          current.undo?.()
        }}
      >
        ↩
      </button>
      <button
        style={hudButtonStyle}
        disabled={!canRedo()}
        onClick={() => {
          const current = getEngine() as { redo?: () => void }
          current.redo?.()
        }}
      >
        ↪
      </button>
      <button
        style={hudButtonStyle}
        disabled={!hasViewportApi()}
        onClick={() => {
          const current = getEngine() as { fitView?: () => void }
          current.fitView?.()
        }}
      >
        ⊡
      </button>
      <input
        type="range"
        min="0.1"
        max="2"
        step="0.05"
        value={zoom()}
        disabled={!hasViewportApi()}
        onInput={(e) => {
          const current = getEngine() as { zoomTo?: (scale: number) => void }
          current.zoomTo?.(Number(e.currentTarget.value))
        }}
        aria-label="Zoom"
        style={{ width: '120px' }}
      />
      <span style={{ 'min-width': '42px', 'font-size': '12px', color: TOKENS.textMuted }}>
        {Math.round(zoom() * 100)}%
      </span>
    </div>
  )
}

const hudButtonStyle = {
  width: '30px',
  height: '30px',
  'border-radius': '7px',
  border: `1px solid ${TOKENS.borderDefault}`,
  background: TOKENS.surfaceBg,
  color: TOKENS.textPrimary,
  cursor: 'pointer',
}

// ── Canvas ────────────────────────────────────────────────────────────────────

const Canvas: Component<{ canvasRef: (el: HTMLElement) => void }> = (props) => (
  <div
    ref={props.canvasRef}
    role="application"
    aria-label="Flow canvas"
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: `radial-gradient(circle, ${TOKENS.dot} 1px, transparent 1px) 0 0 / 24px 24px`,
      'background-color': TOKENS.canvasBg,
      overflow: 'hidden',
    }}
  >
    <EdgeLayer />
    <For each={NODES}>{(node) => <FlowNode data={node} />}</For>
    <LassoOverlay />
    <Hud />
  </div>
)

// ── App ────────────────────────────────────────────────────────────────────────

export const App: Component = () => {
  const { canvasRef, FlowProvider } = createFlowCanvas({
    allowSelfLoop: false,
    enableBuiltinPanZoom: true,
  })

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        height: '100vh',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '12px',
          padding: '0 20px',
          height: '52px',
          background: TOKENS.headerBg,
          color: TOKENS.textPrimary,
          'flex-shrink': '0',
          'border-bottom': `1px solid ${TOKENS.borderDefault}`,
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            'border-radius': '999px',
            background: TOKENS.accent,
            display: 'inline-block',
          }}
        />
        <span
          style={{
            'font-weight': '600',
            'font-size': '15px',
            'font-family': 'Geist Sans, ui-sans-serif, system-ui, sans-serif',
          }}
        >
          HeadFlow
        </span>
        <span
          style={{
            'font-size': '12px',
            color: TOKENS.textMuted,
            border: `1px solid ${TOKENS.borderDefault}`,
            padding: '2px 8px',
            'border-radius': '999px',
          }}
        >
          Solid Demo
        </span>
        <span style={{ 'margin-left': 'auto', 'font-size': '12px', color: '#888' }}>
          Drag nodes · Connect handles · Shift+drag to lasso select
        </span>
      </header>

      {/* Canvas — FlowProvider wraps Canvas so createEdges() + createNode() have context */}
      <FlowProvider>
        <main style={{ flex: '1', overflow: 'hidden' }}>
          <Canvas canvasRef={canvasRef} />
        </main>
      </FlowProvider>
    </div>
  )
}
