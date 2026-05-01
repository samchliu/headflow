import type { Meta, StoryObj } from '@storybook/react'
import { bezierPath } from '@headflow/renderer'

function EdgePreview({
  source,
  target,
  stroke = '#818cf8',
}: {
  source: { x: number; y: number }
  target: { x: number; y: number }
  stroke?: string
}) {
  return (
    <svg width="640" height="220" viewBox="0 0 640 220" style={{ background: '#111', borderRadius: 8 }}>
      <path d={bezierPath(source, target)} fill="none" stroke={stroke} strokeWidth={2} />
      <circle cx={source.x} cy={source.y} r={5} fill="#10b981" />
      <circle cx={target.x} cy={target.y} r={5} fill="#6366f1" />
    </svg>
  )
}

const meta = {
  title: 'Renderer/Bezier Edge',
  component: EdgePreview,
} satisfies Meta<typeof EdgePreview>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  args: { source: { x: 80, y: 110 }, target: { x: 560, y: 110 } },
}

export const Diagonal: Story = {
  args: { source: { x: 80, y: 40 }, target: { x: 520, y: 180 } },
}

export const ReverseDirection: Story = {
  args: { source: { x: 520, y: 70 }, target: { x: 120, y: 160 }, stroke: '#a5b4fc' },
}
