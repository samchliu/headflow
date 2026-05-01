import type { Rect } from '@headflow/core'

/**
 * Normalize any drag-direction rect into top-left origin with positive size.
 */
export function normalizeLassoRect(rect: Rect): Rect {
  return {
    x: rect.w < 0 ? rect.x + rect.w : rect.x,
    y: rect.h < 0 ? rect.y + rect.h : rect.y,
    w: Math.abs(rect.w),
    h: Math.abs(rect.h),
  }
}
