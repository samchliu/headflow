import { createContext, useContext } from 'react'
import type { FlowEngine } from '@headflow/core'

interface FlowContextValue {
  getEngine: () => FlowEngine
}

export const FlowContext = createContext<FlowContextValue | null>(null)

export function useFlowContext(): FlowContextValue {
  const ctx = useContext(FlowContext)
  if (!ctx) {
    throw new Error(
      '[headflow/react] useFlowContext must be called inside a <FlowProvider>.',
    )
  }
  return ctx
}
