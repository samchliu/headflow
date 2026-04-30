import { createContext, useContext } from 'solid-js'
import type { FlowEngine } from '@headflow/core'

export interface FlowContextValue {
  /**
   * Returns the FlowEngine for this canvas.
   * The engine is available after the canvas element mounts (ref fires).
   * Children are guaranteed to see a defined engine because the canvas
   * element mounts before its children in SolidJS.
   */
  getEngine: () => FlowEngine
}

export const FlowContext = createContext<FlowContextValue | undefined>(undefined)

/**
 * Returns the FlowContext for the nearest enclosing <FlowProvider>.
 * Throws if called outside a provider.
 */
export function useFlowContext(): FlowContextValue {
  const ctx = useContext(FlowContext)
  if (!ctx) {
    throw new Error(
      '[headflow/solid] useFlowContext() must be called inside a <FlowProvider>.\n' +
        'Wrap your canvas content with the FlowProvider returned by createFlowCanvas().',
    )
  }
  return ctx
}
