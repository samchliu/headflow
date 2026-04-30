import { type Component, type JSX, onCleanup } from 'solid-js'
import { createFlow } from '@headflow/core'
import type { FlowEngine, FlowOptions } from '@headflow/core'
import { FlowContext } from './context'

export type CreateFlowCanvasOptions = Omit<FlowOptions, 'container'>

export interface CreateFlowCanvasResult {
  /**
   * Assign to the canvas container element's `ref` prop.
   * Must be placed on the FIRST element rendered inside `<FlowProvider>`
   * so the engine is ready before any child nodes/handles mount.
   */
  canvasRef: (el: HTMLElement) => void
  /**
   * SolidJS context provider — wrap your canvas and all node components with this.
   */
  FlowProvider: Component<{ children: JSX.Element }>
}

/**
 * Creates a HeadFlow engine and SolidJS context plumbing.
 *
 * @example
 * ```tsx
 * const { canvasRef, FlowProvider } = createFlowCanvas({ allowSelfLoop: false })
 *
 * return (
 *   <FlowProvider>
 *     <div ref={canvasRef} style={{ position: 'relative', width: '800px', height: '600px' }}>
 *       <MyNode id="a" defaultPosition={{ x: 100, y: 100 }} />
 *       <EdgeLayer />
 *     </div>
 *   </FlowProvider>
 * )
 * ```
 */
export function createFlowCanvas(options?: CreateFlowCanvasOptions): CreateFlowCanvasResult {
  // Plain mutable container — not a signal.
  // This is safe because the canvas element always mounts BEFORE its children
  // in SolidJS, so getEngine() is never called before the engine exists.
  const ctx: { engine?: FlowEngine } = {}

  const canvasRef = (el: HTMLElement) => {
    ctx.engine = createFlow({ container: el, ...options })
    onCleanup(() => ctx.engine?.destroy())
  }

  const FlowProvider: Component<{ children: JSX.Element }> = (props) => (
    <FlowContext.Provider value={{ getEngine: () => ctx.engine! }}>
      {props.children}
    </FlowContext.Provider>
  )

  return { canvasRef, FlowProvider }
}
