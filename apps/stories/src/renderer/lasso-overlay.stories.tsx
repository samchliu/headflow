import type { Meta, StoryObj } from '@storybook/react'
import { normalizeLassoRect } from '@headflow/renderer'

function LassoRect({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const n = normalizeLassoRect({ x, y, w, h })
  return (
    <div
      style={{
        position: 'relative',
        width: 640,
        height: 240,
        background: '#111',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: n.x,
          top: n.y,
          width: n.w,
          height: n.h,
          border: '1.5px dashed #6366f1',
          background: 'rgba(99,102,241,0.07)',
          borderRadius: 4,
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Renderer/Lasso Overlay',
  component: LassoRect,
} satisfies Meta<typeof LassoRect>

export default meta
type Story = StoryObj<typeof meta>

export const PositiveRect: Story = {
  args: { x: 120, y: 50, w: 220, h: 120 },
}

export const DragLeftUp: Story = {
  args: { x: 420, y: 190, w: -240, h: -120 },
}
