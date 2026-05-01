import { describe, expect, it } from 'vitest'
import { normalizeLassoRect } from './lasso'

describe('normalizeLassoRect', () => {
  it('keeps rect unchanged when width and height are positive', () => {
    expect(normalizeLassoRect({ x: 10, y: 20, w: 30, h: 40 })).toEqual({
      x: 10,
      y: 20,
      w: 30,
      h: 40,
    })
  })

  it('normalizes negative width', () => {
    expect(normalizeLassoRect({ x: 20, y: 20, w: -10, h: 30 })).toEqual({
      x: 10,
      y: 20,
      w: 10,
      h: 30,
    })
  })

  it('normalizes negative height', () => {
    expect(normalizeLassoRect({ x: 20, y: 20, w: 10, h: -30 })).toEqual({
      x: 20,
      y: -10,
      w: 10,
      h: 30,
    })
  })

  it('normalizes both negative width and height', () => {
    expect(normalizeLassoRect({ x: 5, y: 5, w: -20, h: -10 })).toEqual({
      x: -15,
      y: -5,
      w: 20,
      h: 10,
    })
  })
})
