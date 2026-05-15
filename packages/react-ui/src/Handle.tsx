import type { CSSProperties } from 'react'
import { useHandle } from '@headflow/react'
import type { HandleType } from '@headflow/react'
import { V } from './tokens'

export type HandlePosition = 'left' | 'right' | 'top' | 'bottom'

const POSITION_STYLES: Record<HandlePosition, CSSProperties> = {
  left:   { left: -7,  top: '50%', transform: 'translateY(-50%)' },
  right:  { right: -7, top: '50%', transform: 'translateY(-50%)' },
  top:    { top: -7,   left: '50%', transform: 'translateX(-50%)' },
  bottom: { bottom: -7, left: '50%', transform: 'translateX(-50%)' },
}

export interface HandleProps {
  nodeId: string
  handleId: string
  type: HandleType
  /** Which edge of the node the handle sits on. */
  position: HandlePosition
  /**
   * Fill colour of the handle dot.
   * Defaults to `--hf-accent` for source and `--hf-accent-alt` for target.
   */
  color?: string
  /** Size of the dot in pixels. Default: 14 */
  size?: number
  style?: CSSProperties
  className?: string
}

/**
 * A styled circular handle dot that registers itself with the HeadFlow engine.
 * Position it on a node edge by setting the `position` prop.
 *
 * Must be rendered inside a node element that has `position: relative` or
 * `position: absolute` (any positioned ancestor).
 *
 * @example
 * ```tsx
 * <BaseNode nodeId="n1" defaultPosition={{ x: 60, y: 100 }}>
 *   <Handle nodeId="n1" handleId="in"  type="target" position="left" />
 *   <Handle nodeId="n1" handleId="out" type="source" position="right" />
 * </BaseNode>
 * ```
 */
export function Handle({
  nodeId,
  handleId,
  type,
  position,
  color,
  size = 14,
  style,
  className,
}: HandleProps) {
  const handleRef = useHandle(nodeId, handleId, type)

  const defaultColor = type === 'source' ? V.accentAlt : V.accent

  return (
    <div
      ref={handleRef}
      data-flow-handle={type}
      data-flow-handle-id={handleId}
      className={className}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color ?? defaultColor,
        border: `2px solid ${V.bgCanvas}`,
        cursor: 'crosshair',
        ...POSITION_STYLES[position],
        ...style,
      }}
    />
  )
}
