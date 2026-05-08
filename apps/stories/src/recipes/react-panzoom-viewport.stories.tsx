import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useState } from 'react'
import { useFlowCanvas, useFlowContext } from '@headflow/react'
import { EdgeLayer, SimpleNode, WorldCanvas, T, btn, toolbar } from './shared'

const NODES = [
  { id: 'n1', label: 'Ingest', kind: 'input' as const, x: 40, y: 60 },
  { id: 'n2', label: 'Validate', kind: 'default' as const, x: 260, y: 30 },
  { id: 'n3', label: 'Enrich', kind: 'default' as const, x: 260, y: 180 },
  { id: 'n4', label: 'Route', kind: 'default' as const, x: 480, y: 100 },
  { id: 'n5', label: 'Sink', kind: 'output' as const, x: 680, y: 60 },
]

function Inner({ canvasRef }: { canvasRef: (el: HTMLElement | null) => void }) {
  const { getEngine } = useFlowContext()
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const engine = getEngine()
    const sync = () => setScale(engine.getViewport().scale)
    sync()
    engine.on('viewportChanged', sync)
    return () => engine.off('viewportChanged', sync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={toolbar}>
        <button
          type="button"
          style={btn}
          onClick={() => getEngine().fitView({ padding: 60 })}
        >
          ⊡ Fit View
        </button>
        <button
          type="button"
          style={btn}
          onClick={() => getEngine().zoomTo(1)}
        >
          100%
        </button>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            color: T.text,
            minWidth: 44,
          }}
        >
          {Math.round(scale * 100)}%
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted }}>
          Scroll to zoom · Drag canvas to pan · Fit View to reset
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <WorldCanvas canvasRef={canvasRef}>
          {NODES.map((n) => (
            <SimpleNode
              key={n.id}
              id={n.id}
              label={n.label}
              kind={n.kind}
              defaultPosition={{ x: n.x, y: n.y }}
            />
          ))}
          <EdgeLayer />
        </WorldCanvas>
      </div>
    </div>
  )
}

/**
 * Shows built-in pan and zoom: scroll to zoom, drag the canvas to pan, and fit all nodes into view.
 * The `viewportChanged` event provides real-time scale feedback for HUD overlays.
 * @summary built-in pan/zoom with fitView and real-time scale readout via viewportChanged
 */
function PanZoomStory() {
  const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })

  return (
    <FlowProvider>
      <Inner canvasRef={canvasRef} />
    </FlowProvider>
  )
}

const meta = {
  title: 'Recipes/React/Pan & Zoom',
  component: PanZoomStory,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '**Why this scenario**: Large canvases with many nodes require pan and zoom so users can navigate freely and focus on specific areas.',
          '',
          '**APIs used**: `useFlowCanvas({ enableBuiltinPanZoom: true })`, `viewportChanged`, `engine.fitView()`, `engine.zoomTo()`',
          '',
          '**Try this**: 1) Scroll (or pinch) to zoom in/out. 2) Drag the canvas background to pan. 3) Click **Fit View** to frame all nodes. 4) Watch the scale readout update in real time.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof PanZoomStory>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Scroll to zoom, drag to pan, click Fit View to frame all nodes; the scale % updates live.
 * @summary pan/zoom interaction with live scale display and fitView reset
 */
export const Default: Story = {}
