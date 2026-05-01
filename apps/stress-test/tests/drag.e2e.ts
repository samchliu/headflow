import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadFixture(page: Page) {
  await page.goto('/interaction.html')
  // Wait for engine to be ready
  await page.waitForFunction(() => typeof window.__hf !== 'undefined')
  await page.waitForSelector('[data-flow-node="nodeA"]')
}

async function getNodePosition(page: Page, nodeId: string) {
  return page.evaluate((id) => {
    const state = window.__hf.serialize()
    return state.nodes.find((n) => n.id === id)?.position ?? null
  }, nodeId)
}

async function getNodeTransform(page: Page, nodeId: string): Promise<string> {
  return page.locator(`[data-flow-node="${nodeId}"]`).evaluate((el) => el.style.transform)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Node drag', () => {
  test('drag moves node to new canvas position', async ({ page }) => {
    await loadFixture(page)

    const initialPos = await getNodePosition(page, 'nodeA')
    expect(initialPos).not.toBeNull()

    const node = page.locator('[data-flow-node="nodeA"]')
    const box = await node.boundingBox()
    expect(box).not.toBeNull()

    const cx = box!.x + box!.width / 2
    const cy = box!.y + box!.height / 2

    // Drag 120px right, 60px down
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 120, cy + 60, { steps: 15 })
    await page.mouse.up()

    const finalPos = await getNodePosition(page, 'nodeA')
    expect(finalPos).not.toBeNull()

    // At scale=1, canvas delta == viewport delta
    const dx = finalPos!.x - initialPos!.x
    const dy = finalPos!.y - initialPos!.y

    expect(dx).toBeGreaterThan(110)  // ~120 px
    expect(dx).toBeLessThan(130)
    expect(dy).toBeGreaterThan(50)   // ~60 px
    expect(dy).toBeLessThan(70)
  })

  test('style.transform updates after drag', async ({ page }) => {
    await loadFixture(page)

    const node = page.locator('[data-flow-node="nodeA"]')
    const box = await node.boundingBox()
    expect(box).not.toBeNull()

    const transformBefore = await getNodeTransform(page, 'nodeA')

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2 + 40, { steps: 10 })
    await page.mouse.up()

    const transformAfter = await getNodeTransform(page, 'nodeA')

    expect(transformAfter).not.toBe(transformBefore)
    // Transform should encode the new position
    expect(transformAfter).toMatch(/^translate\(\d+(\.\d+)?px, \d+(\.\d+)?px\)$/)
  })

  test('drag does not affect other nodes', async ({ page }) => {
    await loadFixture(page)

    const posBefore = await getNodePosition(page, 'nodeB')

    // Only drag nodeA
    const nodeA = page.locator('[data-flow-node="nodeA"]')
    const box = await nodeA.boundingBox()
    expect(box).not.toBeNull()

    await page.mouse.move(box!.x + 40, box!.y + 22)
    await page.mouse.down()
    await page.mouse.move(box!.x + 140, box!.y + 72, { steps: 10 })
    await page.mouse.up()

    const posAfter = await getNodePosition(page, 'nodeB')
    expect(posAfter).toEqual(posBefore)
  })

  test('serialize captures position after drag', async ({ page }) => {
    await loadFixture(page)

    const node = page.locator('[data-flow-node="nodeA"]')
    const box = await node.boundingBox()
    expect(box).not.toBeNull()

    await page.mouse.move(box!.x + 40, box!.y + 22)
    await page.mouse.down()
    await page.mouse.move(box!.x + 240, box!.y + 22, { steps: 20 })
    await page.mouse.up()

    const serialized = await page.evaluate(() => window.__hf.serialize())

    const nodeAState = serialized.nodes.find((n) => n.id === 'nodeA')
    expect(nodeAState).not.toBeUndefined()
    // Should have moved significantly to the right
    expect(nodeAState!.position.x).toBeGreaterThan(150)
  })

  test('drag on scaled canvas — canvas delta is viewport delta / scale', async ({ page }) => {
    await loadFixture(page)

    // Set scale to 2 — same viewport pixel movement = half canvas-space delta
    await page.evaluate(() => window.__hf.setTransform({ scale: 2, translateX: 0, translateY: 0 }))

    const initialPos = await getNodePosition(page, 'nodeD')
    expect(initialPos).not.toBeNull()

    const nodeD = page.locator('[data-flow-node="nodeD"]')
    const box = await nodeD.boundingBox()
    expect(box).not.toBeNull()

    // Drag 100 viewport pixels right
    await page.mouse.move(box!.x + 60, box!.y + 22)
    await page.mouse.down()
    await page.mouse.move(box!.x + 160, box!.y + 22, { steps: 10 })
    await page.mouse.up()

    const finalPos = await getNodePosition(page, 'nodeD')
    expect(finalPos).not.toBeNull()

    // At scale=2: viewport 100px → canvas 50px
    const dx = finalPos!.x - initialPos!.x
    expect(dx).toBeGreaterThan(40)
    expect(dx).toBeLessThan(60)
  })
})
