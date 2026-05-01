import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadFixture(page: Page) {
  await page.goto('/interaction.html')
  await page.waitForFunction(() => typeof window.__hf !== 'undefined')
  await page.waitForSelector('[data-flow-node="nodeA"]')
}

async function getEdgeCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__hf.getEdges().length)
}

async function clearEdges(page: Page): Promise<void> {
  await page.evaluate(() => {
    const edges = window.__hf.getEdges()
    edges.forEach((e) => window.__hf.removeEdge(e.id))
  })
}

async function dragFromTo(
  page: Page,
  fromSelector: string,
  toSelector: string,
  steps = 20,
): Promise<void> {
  const from = page.locator(fromSelector)
  const to = page.locator(toSelector)

  const fromBox = await from.boundingBox()
  const toBox = await to.boundingBox()
  expect(fromBox).not.toBeNull()
  expect(toBox).not.toBeNull()

  const fx = fromBox!.x + fromBox!.width / 2
  const fy = fromBox!.y + fromBox!.height / 2
  const tx = toBox!.x + toBox!.width / 2
  const ty = toBox!.y + toBox!.height / 2

  await page.mouse.move(fx, fy)
  await page.mouse.down()
  await page.mouse.move(tx, ty, { steps })
  await page.mouse.up()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Edge creation', () => {
  test('dragging source to target creates an edge', async ({ page }) => {
    await loadFixture(page)
    expect(await getEdgeCount(page)).toBe(0)

    // Drag from Node A source handle → Node B target handle
    await dragFromTo(
      page,
      '[data-testid="nodeA-out"]',
      '[data-testid="nodeB-in"]',
    )

    expect(await getEdgeCount(page)).toBe(1)

    const edges = await page.evaluate(() => window.__hf.getEdges())
    expect(edges[0].source.nodeId).toBe('nodeA')
    expect(edges[0].source.handleId).toBe('out')
    expect(edges[0].target.nodeId).toBe('nodeB')
    expect(edges[0].target.handleId).toBe('in')
  })

  test('edge carries canvas-space pts for both endpoints', async ({ page }) => {
    await loadFixture(page)

    await dragFromTo(
      page,
      '[data-testid="nodeA-out"]',
      '[data-testid="nodeB-in"]',
    )

    const edge = await page.evaluate(() => window.__hf.getEdges()[0])
    // Both pts should be finite numbers
    expect(isFinite(edge.source.pt.x)).toBe(true)
    expect(isFinite(edge.source.pt.y)).toBe(true)
    expect(isFinite(edge.target.pt.x)).toBe(true)
    expect(isFinite(edge.target.pt.y)).toBe(true)
    // Source should be to the left of target in canvas space
    expect(edge.source.pt.x).toBeLessThan(edge.target.pt.x)
  })

  test('dragging source to empty space cancels edge creation', async ({ page }) => {
    await loadFixture(page)

    const srcBox = await page.locator('[data-testid="nodeA-out"]').boundingBox()
    expect(srcBox).not.toBeNull()

    const fx = srcBox!.x + srcBox!.width / 2
    const fy = srcBox!.y + srcBox!.height / 2

    // Drag to empty area in the bottom-right quadrant
    await page.mouse.move(fx, fy)
    await page.mouse.down()
    await page.mouse.move(700, 500, { steps: 20 })
    await page.mouse.up()

    expect(await getEdgeCount(page)).toBe(0)
  })

  test('self-loop is blocked when allowSelfLoop is false', async ({ page }) => {
    await loadFixture(page)

    // Node B has both a source and a target handle
    await dragFromTo(
      page,
      '[data-testid="nodeB-out"]',
      '[data-testid="nodeB-in"]',
    )

    expect(await getEdgeCount(page)).toBe(0)
  })

  test('second drag on same target handle does not create duplicate edge', async ({ page }) => {
    await loadFixture(page)

    // First edge: A → B
    await dragFromTo(
      page,
      '[data-testid="nodeA-out"]',
      '[data-testid="nodeB-in"]',
    )
    expect(await getEdgeCount(page)).toBe(1)

    // Second drag: A → B again (same target handle)
    await dragFromTo(
      page,
      '[data-testid="nodeA-out"]',
      '[data-testid="nodeB-in"]',
    )

    // Still 1 edge — duplicate connection on a non-multiple target is blocked
    expect(await getEdgeCount(page)).toBe(1)
  })

  test('removeEdge deletes the edge and count drops to zero', async ({ page }) => {
    await loadFixture(page)

    await dragFromTo(
      page,
      '[data-testid="nodeA-out"]',
      '[data-testid="nodeB-in"]',
    )
    expect(await getEdgeCount(page)).toBe(1)

    await page.evaluate(() => {
      const edge = window.__hf.getEdges()[0]
      window.__hf.removeEdge(edge.id)
    })

    expect(await getEdgeCount(page)).toBe(0)
  })

  test('chained edges: A→B and B→C both created', async ({ page }) => {
    await loadFixture(page)

    await dragFromTo(
      page,
      '[data-testid="nodeA-out"]',
      '[data-testid="nodeB-in"]',
    )
    await dragFromTo(
      page,
      '[data-testid="nodeB-out"]',
      '[data-testid="nodeC-in"]',
    )

    expect(await getEdgeCount(page)).toBe(2)

    const edges = await page.evaluate(() => window.__hf.getEdges())
    const nodeIds = new Set(edges.map((e) => e.target.nodeId))
    expect(nodeIds.has('nodeB')).toBe(true)
    expect(nodeIds.has('nodeC')).toBe(true)
  })

  test('unregistering a node deletes its connected edges (cascade)', async ({ page }) => {
    await loadFixture(page)

    await dragFromTo(
      page,
      '[data-testid="nodeA-out"]',
      '[data-testid="nodeB-in"]',
    )
    expect(await getEdgeCount(page)).toBe(1)

    // Remove node A's source handle — should cascade-delete edge
    await page.evaluate(() => window.__hf.unregisterHandle('nodeA', 'out'))

    expect(await getEdgeCount(page)).toBe(0)
  })
})
