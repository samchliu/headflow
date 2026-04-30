import type { CanvasTransform, Point } from './types'

export const DEFAULT_TRANSFORM: CanvasTransform = {
  scale: 1,
  translateX: 0,
  translateY: 0,
}

/**
 * Convert a viewport-space point (relative to the canvas container top-left)
 * to canvas-space coordinates.
 *
 * Canvas space is the logical coordinate system where nodes live.
 * Viewport space is what getBoundingClientRect() returns minus the container offset.
 *
 * Formula: canvasX = (viewportX - translateX) / scale
 */
export function toCanvasSpace(viewportPt: Point, t: CanvasTransform): Point {
  return {
    x: (viewportPt.x - t.translateX) / t.scale,
    y: (viewportPt.y - t.translateY) / t.scale,
  }
}

/**
 * Convert a canvas-space point to viewport-space.
 */
export function toViewportSpace(canvasPt: Point, t: CanvasTransform): Point {
  return {
    x: canvasPt.x * t.scale + t.translateX,
    y: canvasPt.y * t.scale + t.translateY,
  }
}

/**
 * Get the canvas-space center point of an element relative to a container.
 * Reads getBoundingClientRect (triggers layout, batch in rAF when possible).
 */
export function getElementCanvasCenter(
  el: HTMLElement,
  container: HTMLElement,
  t: CanvasTransform,
): Point {
  const cr = container.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  return toCanvasSpace(
    {
      x: er.left + er.width / 2 - cr.left,
      y: er.top + er.height / 2 - cr.top,
    },
    t,
  )
}

/**
 * Read the initial canvas-space position of a node from its current
 * offsetLeft/offsetTop (relative to its offsetParent, which should be the canvas).
 * Called once at registration time for Vanilla-mode nodes that use CSS left/top.
 */
export function getNodeInitialPosition(el: HTMLElement): Point {
  return { x: el.offsetLeft, y: el.offsetTop }
}
