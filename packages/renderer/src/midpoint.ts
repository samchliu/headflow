import type { Point } from '@headflow/core'

/**
 * Midpoint of the straight line between source and target — deliberately
 * ignores bezier curvature (matches `hitTestEdges`'s simplification).
 */
export function edgeMidpoint(source: Point, target: Point): Point {
  return {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  }
}
