import { describe, expect, it } from 'vitest'
import { bezierPath } from './bezier'

describe('bezierPath', () => {
  it('builds a cubic path string from source to target', () => {
    const result = bezierPath({ x: 10, y: 20 }, { x: 210, y: 120 })
    expect(result).toBe('M 10,20 C 110,20 110,120 210,120')
  })

  it('keeps min control offset for short horizontal distance', () => {
    const result = bezierPath({ x: 0, y: 0 }, { x: 20, y: 10 })
    expect(result).toBe('M 0,0 C 40,0 -20,10 20,10')
  })

  it('works with vertical edges', () => {
    const result = bezierPath({ x: 50, y: 10 }, { x: 50, y: 110 })
    expect(result).toBe('M 50,10 C 90,10 10,110 50,110')
  })

  it('works when target is left of source', () => {
    const result = bezierPath({ x: 300, y: 60 }, { x: 100, y: 60 })
    expect(result).toBe('M 300,60 C 400,60 0,60 100,60')
  })

  it('works with negative coordinates', () => {
    const result = bezierPath({ x: -100, y: -30 }, { x: 100, y: 30 })
    expect(result).toBe('M -100,-30 C 0,-30 0,30 100,30')
  })

  it('returns deterministic string output', () => {
    const first = bezierPath({ x: 1, y: 2 }, { x: 3, y: 4 })
    const second = bezierPath({ x: 1, y: 2 }, { x: 3, y: 4 })
    expect(first).toBe(second)
  })

  it('preserves source and target endpoints exactly', () => {
    const result = bezierPath({ x: 12.5, y: 7.25 }, { x: 88.75, y: 101.5 })
    expect(result.startsWith('M 12.5,7.25 C ')).toBe(true)
    expect(result.endsWith(' 88.75,101.5')).toBe(true)
  })

  it('does not mutate input points', () => {
    const source = { x: 1, y: 1 }
    const target = { x: 2, y: 2 }
    bezierPath(source, target)
    expect(source).toEqual({ x: 1, y: 1 })
    expect(target).toEqual({ x: 2, y: 2 })
  })
})
