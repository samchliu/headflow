import type { CSSProperties, ReactNode } from 'react'
import { useViewport } from '@headflow/react'
import { V } from './tokens'

export interface FlowCanvasProps {
  /**
   * Callback ref returned by `useFlowCanvas` — must be attached to this element.
   * The engine is initialised when this ref fires.
   */
  canvasRef: (el: HTMLElement | null) => void
  children: ReactNode
  /** Override outer container styles (background, size, etc.) */
  style?: CSSProperties
  className?: string
}

/**
 * Full-size canvas container with a dot-grid background that applies the
 * engine's viewport transform to its children.
 *
 * Must be rendered inside a `<FlowProvider>`.
 *
 * @example
 * ```tsx
 * const { canvasRef, FlowProvider } = useFlowCanvas({ enableBuiltinPanZoom: true })
 * return (
 *   <FlowProvider>
 *     <FlowCanvas canvasRef={canvasRef}>
 *       <MyNode id="n1" defaultPosition={{ x: 60, y: 100 }} />
 *       <EdgeLayer />
 *       <LassoRect />
 *     </FlowCanvas>
 *   </FlowProvider>
 * )
 * ```
 */
export function FlowCanvas({ canvasRef, children, style, className }: FlowCanvasProps) {
  const { scale, translateX, translateY } = useViewport()

  return (
    <div
      ref={canvasRef}
      tabIndex={0}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: V.bgCanvas,
        backgroundImage: `radial-gradient(circle, ${V.dotColor} 1px, transparent 1px)`,
        backgroundSize: `${V.dotSize} ${V.dotSize}`,
        outline: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '0 0',
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
