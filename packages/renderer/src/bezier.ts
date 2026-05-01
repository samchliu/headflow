import type { Point } from '@headflow/core'

const MIN_CONTROL_OFFSET = 40

/**
 * Build a cubic bezier SVG path between source and target points.
 * Uses horizontal control handles for a smooth flow-like edge.
 */
export function bezierPath(source: Point, target: Point): string {
  const dx = Math.abs(target.x - source.x)
  const offset = Math.max(dx * 0.5, MIN_CONTROL_OFFSET)

  const c1x = source.x + offset
  const c1y = source.y
  const c2x = target.x - offset
  const c2y = target.y

  return `M ${source.x},${source.y} C ${c1x},${c1y} ${c2x},${c2y} ${target.x},${target.y}`
}
