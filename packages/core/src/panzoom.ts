import type { CanvasTransform } from './types'

const MIN_SCALE = 0.05
const MAX_SCALE = 8

/**
 * Attach built-in pan/zoom behaviour to a container element.
 *
 * Wheel behaviour:
 *   - Ctrl/Cmd + wheel  →  zoom (anchored at pointer position)
 *   - Plain wheel / two-finger trackpad pan  →  translate
 *
 * Returns a cleanup function that removes all listeners.
 */
export function setupPanZoom(
  container: HTMLElement,
  getTransform: () => CanvasTransform,
  setTransform: (partial: Partial<CanvasTransform>) => void,
): () => void {
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const t = getTransform()
    const rect = container.getBoundingClientRect()
    const pointerX = e.clientX - rect.left
    const pointerY = e.clientY - rect.top

    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom or Ctrl/Cmd+wheel → zoom anchored at pointer
      // deltaY from pinch is typically in the range [-5, 5] per tick
      const delta = -e.deltaY * 0.005
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * (1 + delta)))

      const canvasX = (pointerX - t.translateX) / t.scale
      const canvasY = (pointerY - t.translateY) / t.scale

      setTransform({
        scale: newScale,
        translateX: pointerX - canvasX * newScale,
        translateY: pointerY - canvasY * newScale,
      })
    } else {
      // Two-finger swipe / scroll wheel → pan
      // Normalize deltaMode: LINE (1) or PAGE (2) → approximate pixel values
      const factor = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? 300 : 1
      setTransform({
        translateX: t.translateX - e.deltaX * factor,
        translateY: t.translateY - e.deltaY * factor,
      })
    }
  }

  container.addEventListener('wheel', onWheel, { passive: false })
  return () => container.removeEventListener('wheel', onWheel)
}
