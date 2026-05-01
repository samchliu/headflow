import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadFixture(page: Page) {
  await page.goto('/interaction.html')
  await page.waitForFunction(() => typeof window.__hf !== 'undefined')
  await page.waitForSelector('[data-flow-node="nodeA"]')
}

async function getSelection(page: Page): Promise<string[]> {
  return page.evaluate(() => [...window.__hf.getSelection()])
}

async function clearSelection(page: Page): Promise<void> {
  await page.evaluate(() => window.__hf.clearSelection())
}

/**
 * Perform a lasso drag from (x1,y1) to (x2,y2) in viewport space.
 * Adds optional keyboard modifier (e.g. 'Shift') for additive selection.
 */
async function lassoRect(
  page: Page,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  modifier?: string,
  steps = 20,
) {
  if (modifier) await page.keyboard.down(modifier)
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  await page.mouse.move(x2, y2, { steps })
  await page.mouse.up()
  if (modifier) await page.keyboard.up(modifier)
}

// ── Canvas layout reference (all values in viewport px at scale=1) ─────────────
// Canvas #canvas starts at (0, 0) in the page since the page has no margin.
// Nodes (left edges in viewport, approximate):
//   Node A: x≈80,  y≈100  width=120  height=44
//   Node B: x≈300, y≈100  width=120  height=44
//   Node C: x≈520, y≈100  width=120  height=44
//   Node D: x≈80,  y≈300  width=120  height=44
// Empty top-left corner: x=0..70, y=0..90  → safe lasso origin

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Lasso selection', () => {
  test('lasso over Node A selects it', async ({ page }) => {
    await loadFixture(page)

    // Drag from top-left corner through Node A
    // Start at empty area (x=10, y=10), end at (250, 170) — well past Node A
    await lassoRect(page, 10, 10, 250, 175)

    const sel = await getSelection(page)
    expect(sel).toContain('nodeA')
  })

  test('lasso that misses all nodes results in empty selection', async ({ page }) => {
    await loadFixture(page)

    // Drag entirely in the bottom-right quadrant where no nodes live
    await lassoRect(page, 640, 430, 780, 580)

    const sel = await getSelection(page)
    expect(sel).toHaveLength(0)
  })

  test('lasso over Node A and Node D selects both', async ({ page }) => {
    await loadFixture(page)

    // Drag from (10, 10) to (210, 370) — covers A (y=100..144) and D (y=300..344)
    await lassoRect(page, 10, 10, 210, 370)

    const sel = await getSelection(page)
    expect(sel).toContain('nodeA')
    expect(sel).toContain('nodeD')
    expect(sel).not.toContain('nodeB')
    expect(sel).not.toContain('nodeC')
  })

  test('lasso replaces existing selection', async ({ page }) => {
    await loadFixture(page)

    // First select Node B via API
    await page.evaluate(() => window.__hf.selectNode('nodeB'))
    expect(await getSelection(page)).toContain('nodeB')

    // Lasso over Node A only — without Shift, should replace selection
    await lassoRect(page, 10, 10, 250, 175)

    const sel = await getSelection(page)
    expect(sel).toContain('nodeA')
    expect(sel).not.toContain('nodeB')
  })

  test('Shift+lasso appends to existing selection', async ({ page }) => {
    await loadFixture(page)

    // Pre-select Node B programmatically
    await page.evaluate(() => window.__hf.selectNode('nodeB'))
    expect(await getSelection(page)).toContain('nodeB')

    // Shift+lasso over Node A → should ADD nodeA without clearing nodeB
    await lassoRect(page, 10, 10, 250, 175, 'Shift')

    const sel = await getSelection(page)
    expect(sel).toContain('nodeA')
    expect(sel).toContain('nodeB')
  })

  test('lasso over all nodes selects all four', async ({ page }) => {
    await loadFixture(page)

    // Drag a huge rect covering the whole canvas
    await lassoRect(page, 5, 5, 750, 380)

    const sel = await getSelection(page)
    expect(sel).toContain('nodeA')
    expect(sel).toContain('nodeB')
    expect(sel).toContain('nodeC')
    expect(sel).toContain('nodeD')
  })

  test('clearSelection() empties selection after lasso', async ({ page }) => {
    await loadFixture(page)

    await lassoRect(page, 5, 5, 750, 380)
    expect((await getSelection(page)).length).toBeGreaterThan(0)

    await clearSelection(page)
    expect(await getSelection(page)).toHaveLength(0)
  })

  test('lasso emits lassoUpdate events during drag', async ({ page }) => {
    await loadFixture(page)

    // Spy on lassoUpdate events
    await page.evaluate(() => {
      ;(window as Window & { __lassoUpdates?: number[] }).__lassoUpdates = []
      window.__hf.on('lassoUpdate', () => {
        ;(window as Window & { __lassoUpdates?: number[] }).__lassoUpdates!.push(Date.now())
      })
    })

    // Slow lasso so multiple rAF ticks fire
    await lassoRect(page, 10, 10, 250, 375, undefined, 30)

    const count = await page.evaluate(
      () => (window as Window & { __lassoUpdates?: number[] }).__lassoUpdates?.length ?? 0,
    )
    expect(count).toBeGreaterThan(0)
  })

  test('moveSelectionBy moves all selected nodes', async ({ page }) => {
    await loadFixture(page)

    // Select Node A and Node D
    await lassoRect(page, 10, 10, 210, 370)

    const beforeA = await page.evaluate(() =>
      window.__hf.serialize().nodes.find((n) => n.id === 'nodeA')?.position,
    )
    const beforeD = await page.evaluate(() =>
      window.__hf.serialize().nodes.find((n) => n.id === 'nodeD')?.position,
    )

    await page.evaluate(() => window.__hf.moveSelectionBy({ x: 50, y: 30 }))

    const afterA = await page.evaluate(() =>
      window.__hf.serialize().nodes.find((n) => n.id === 'nodeA')?.position,
    )
    const afterD = await page.evaluate(() =>
      window.__hf.serialize().nodes.find((n) => n.id === 'nodeD')?.position,
    )

    expect(afterA!.x - beforeA!.x).toBeCloseTo(50, 0)
    expect(afterA!.y - beforeA!.y).toBeCloseTo(30, 0)
    expect(afterD!.x - beforeD!.x).toBeCloseTo(50, 0)
    expect(afterD!.y - beforeD!.y).toBeCloseTo(30, 0)
  })
})
