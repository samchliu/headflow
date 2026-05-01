/// <reference types="vitest/globals" />
// Mirror core test-setup: give jsdom predictable getBoundingClientRect values
const originalGetBCR = HTMLElement.prototype.getBoundingClientRect
beforeEach(() => {
  HTMLElement.prototype.getBoundingClientRect = function () {
    const left = parseFloat(this.dataset.testLeft ?? '0')
    const top = parseFloat(this.dataset.testTop ?? '0')
    const width = parseFloat(this.dataset.testWidth ?? '10')
    const height = parseFloat(this.dataset.testHeight ?? '10')
    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect
  }
})

afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = originalGetBCR
})
