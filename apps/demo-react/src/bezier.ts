import type { Point } from '@headflow/react'

/**
 * Cubic Bezier path for an edge between two handle center points.
 * The control-point offset is proportional to the horizontal distance
 * so the curve looks natural even for short or long edges.
 */
export function bezierPath(source: Point, target: Point): string {
  const dx = Math.abs(target.x - source.x)
  const offset = Math.max(dx * 0.5, 40)
  return [
    `M${source.x},${source.y}`,
    `C${source.x + offset},${source.y}`,
    `${target.x - offset},${target.y}`,
    `${target.x},${target.y}`,
  ].join(' ')
}
