import type { CSSProperties } from 'react'
import { useLasso } from '@headflow/react'
import { V } from './tokens'

export interface LassoRectProps {
  /** Override the lasso overlay styles. */
  style?: CSSProperties
  className?: string
}

/**
 * Renders the lasso selection rectangle while the user drags on the canvas
 * background. Renders nothing when no lasso is active.
 *
 * Must be rendered inside a `<FlowProvider>` but OUTSIDE the world transform
 * layer so it stays in viewport space.
 *
 * @example
 * ```tsx
 * // Place as a sibling of FlowCanvas, or outside the transformed div
 * <div style={{ position: 'relative', width: '100%', height: '100%' }}>
 *   <FlowCanvas canvasRef={canvasRef}>...</FlowCanvas>
 *   <LassoRect />
 * </div>
 * ```
 */
export function LassoRect({ style, className }: LassoRectProps) {
  const lasso = useLasso()
  if (!lasso) return null

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: lasso.x,
        top: lasso.y,
        width: lasso.w,
        height: lasso.h,
        border: `1px solid ${V.accent}`,
        background: 'rgba(99,102,241,0.08)',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}
