import type { Meta, StoryObj } from '@storybook/react'
import { bezierPath } from '@headflow/renderer'

function DraftEdge({ targetX, targetY }: { targetX: number; targetY: number }) {
  const source = { x: 120, y: 110 }
  const target = { x: targetX, y: targetY }

  return (
    <svg width="640" height="220" viewBox="0 0 640 220" style={{ background: '#111', borderRadius: 8 }}>
      <path d={bezierPath(source, target)} fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="6 5" />
      <circle cx={source.x} cy={source.y} r={5} fill="#10b981" />
      <circle cx={target.x} cy={target.y} r={5} fill="#6366f1" opacity={0.85} />
    </svg>
  )
}

const meta = {
  title: 'Renderer/Draft Edge',
  component: DraftEdge,
} satisfies Meta<typeof DraftEdge>

export default meta
type Story = StoryObj<typeof meta>

export const MidDrag: Story = {
  args: { targetX: 380, targetY: 140 },
}

export const LongDrag: Story = {
  args: { targetX: 560, targetY: 70 },
}
