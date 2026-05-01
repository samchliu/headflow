import type { Meta, StoryObj } from '@storybook/react'
import { App } from '../../../demo-react/src/App'

function ReactCanvasStory() {
  return (
    <div style={{ width: 1000, height: 640, border: '1px solid #262626', borderRadius: 10, overflow: 'hidden' }}>
      <App />
    </div>
  )
}

const meta = {
  title: 'Canvas/React Demo',
  component: ReactCanvasStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ReactCanvasStory>

export default meta
type Story = StoryObj<typeof meta>

export const DefaultCanvas: Story = {}
