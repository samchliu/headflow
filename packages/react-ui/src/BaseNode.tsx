import type { CSSProperties, ReactNode } from 'react'
import { useNode, useSelection } from '@headflow/react'
import type { Point } from '@headflow/react'
import { V } from './tokens'

export interface BaseNodeProps {
  nodeId: string
  defaultPosition: Point
  children?: ReactNode
  /**
   * Accent colour painted on the top border.
   * Pass a CSS colour string or a `--hf-*` variable reference.
   * Defaults to `--hf-accent`.
   */
  accent?: string
  /** Width in pixels. Default: 140 */
  width?: number
  style?: CSSProperties
  className?: string
}

/**
 * A card-style node shell that registers itself with the HeadFlow engine and
 * applies selection styles automatically.
 *
 * Place `<Handle>` components inside to add connection points.
 *
 * @example
 * ```tsx
 * <BaseNode nodeId="n1" defaultPosition={{ x: 60, y: 100 }} accent={V.accentAlt}>
 *   <Handle nodeId="n1" handleId="in"  type="target" position="left" />
 *   <span>My Node</span>
 *   <Handle nodeId="n1" handleId="out" type="source" position="right" />
 * </BaseNode>
 * ```
 */
export function BaseNode({
  nodeId,
  defaultPosition,
  children,
  accent = V.accent,
  width = 140,
  style,
  className,
}: BaseNodeProps) {
  const nodeRef = useNode(nodeId, { defaultPosition })
  const selected = useSelection().has(nodeId)

  return (
    <div
      ref={nodeRef}
      data-selected={selected || undefined}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        background: selected ? '#1a1836' : V.bgSurface,
        border: `1.5px solid ${selected ? V.borderAccent : V.borderDefault}`,
        borderTop: `4px solid ${accent}`,
        borderRadius: 8,
        padding: '10px 14px',
        cursor: 'grab',
        userSelect: 'none',
        color: V.text,
        fontSize: 13,
        fontFamily: 'ui-monospace, monospace',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
