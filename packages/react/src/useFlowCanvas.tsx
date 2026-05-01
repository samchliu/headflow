import { useCallback, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { createFlow } from '@headflow/core'
import type { FlowEngine, FlowOptions } from '@headflow/core'
import { FlowContext } from './context'

export type UseFlowCanvasOptions = Omit<FlowOptions, 'container'>

export interface UseFlowCanvasResult {
  /**
   * Attach this ref to the canvas container element.
   *
   * @example
   * ```tsx
   * <div ref={canvasRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
   *   {children}
   * </div>
   * ```
   */
  canvasRef: (el: HTMLElement | null) => void
  /**
   * Wrap your node graph content with this provider so all child hooks can
   * access the engine.
   */
  FlowProvider: (props: { children: ReactNode }) => JSX.Element
}

export function useFlowCanvas(
  options?: UseFlowCanvasOptions,
): UseFlowCanvasResult {
  // Stable ref for the engine instance — never triggers re-render
  const engineRef = useRef<FlowEngine | null>(null)

  const canvasRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) {
        engineRef.current?.destroy()
        engineRef.current = null
        return
      }
      engineRef.current = createFlow({
        container: el,
        allowSelfLoop: options?.allowSelfLoop,
        enableBuiltinPanZoom: options?.enableBuiltinPanZoom,
      })
    },
    // Options are read once at mount — changing them after mount has no effect.
    // This is intentional and documented; call engine methods directly to update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Stable context value — never causes provider children to re-render
  const contextValue = useMemo(
    () => ({
      getEngine: () => {
        if (!engineRef.current) {
          throw new Error(
            '[headflow/react] Engine not initialised — is canvasRef attached?',
          )
        }
        return engineRef.current
      },
    }),
    [],
  )

  // Stable component reference — memo'd so React never remounts children
  const FlowProvider = useMemo(
    () =>
      function FlowProvider({ children }: { children: ReactNode }) {
        return (
          <FlowContext.Provider value={contextValue}>
            {children}
          </FlowContext.Provider>
        )
      },
    [contextValue],
  )

  return { canvasRef, FlowProvider }
}
