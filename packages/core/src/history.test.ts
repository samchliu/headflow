import { describe, it, expect, vi } from 'vitest'
import { createHistoryManager } from './history'

describe('createHistoryManager', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistoryManager()
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
  })

  it('record + undo calls undo callback', () => {
    const h = createHistoryManager()
    const undo = vi.fn()
    const redo = vi.fn()
    h.record({ undo, redo })

    expect(h.canUndo()).toBe(true)
    expect(h.canRedo()).toBe(false)

    h.undo()
    expect(undo).toHaveBeenCalledOnce()
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(true)
  })

  it('undo then redo calls redo callback', () => {
    const h = createHistoryManager()
    const undo = vi.fn()
    const redo = vi.fn()
    h.record({ undo, redo })
    h.undo()
    h.redo()

    expect(redo).toHaveBeenCalledOnce()
    expect(h.canUndo()).toBe(true)
    expect(h.canRedo()).toBe(false)
  })

  it('new record clears redo stack', () => {
    const h = createHistoryManager()
    h.record({ undo: vi.fn(), redo: vi.fn() })
    h.undo()
    expect(h.canRedo()).toBe(true)

    h.record({ undo: vi.fn(), redo: vi.fn() })
    expect(h.canRedo()).toBe(false)
  })

  it('multiple records maintain stack order (LIFO)', () => {
    const h = createHistoryManager()
    const log: string[] = []
    h.record({ undo: () => log.push('undo-1'), redo: () => {} })
    h.record({ undo: () => log.push('undo-2'), redo: () => {} })
    h.record({ undo: () => log.push('undo-3'), redo: () => {} })

    h.undo()
    h.undo()
    expect(log).toEqual(['undo-3', 'undo-2'])
  })

  it('record during undo is silently ignored (no re-recording)', () => {
    const h = createHistoryManager()
    let callCount = 0

    h.record({
      undo() {
        callCount++
        // This record should be ignored because we are inside undo
        h.record({ undo: () => callCount++, redo: () => {} })
      },
      redo: vi.fn(),
    })

    expect(h.canUndo()).toBe(true)
    h.undo()
    expect(callCount).toBe(1)
    // The re-record inside undo should be silently dropped
    expect(h.canUndo()).toBe(false)
  })

  it('undo/redo on empty stack is a no-op', () => {
    const h = createHistoryManager()
    expect(() => h.undo()).not.toThrow()
    expect(() => h.redo()).not.toThrow()
  })

  it('clear resets both stacks', () => {
    const h = createHistoryManager()
    h.record({ undo: vi.fn(), redo: vi.fn() })
    h.record({ undo: vi.fn(), redo: vi.fn() })
    h.clear()
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
  })
})
