import { describe, expect, it } from 'vitest'
import { edgeMidpoint } from './midpoint'

describe('edgeMidpoint', () => {
  it('returns the average of source and target', () => {
    expect(edgeMidpoint({ x: 0, y: 0 }, { x: 100, y: 200 })).toEqual({ x: 50, y: 100 })
  })

  it('works when target is left of / above source', () => {
    expect(edgeMidpoint({ x: 300, y: 60 }, { x: 100, y: 20 })).toEqual({ x: 200, y: 40 })
  })

  it('works with negative coordinates', () => {
    expect(edgeMidpoint({ x: -100, y: -30 }, { x: 100, y: 30 })).toEqual({ x: 0, y: 0 })
  })

  it('returns the same point when source equals target', () => {
    expect(edgeMidpoint({ x: 42, y: 7 }, { x: 42, y: 7 })).toEqual({ x: 42, y: 7 })
  })

  it('does not mutate input points', () => {
    const source = { x: 1, y: 1 }
    const target = { x: 3, y: 5 }
    edgeMidpoint(source, target)
    expect(source).toEqual({ x: 1, y: 1 })
    expect(target).toEqual({ x: 3, y: 5 })
  })
})
