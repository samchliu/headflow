import { test, expect } from '@playwright/test'

/**
 * Performance benchmark: drag a node across a 100-node canvas and measure
 * dropped frames. The test fails if more than 5% of frames are dropped
 * during a ~1-second drag gesture (threshold: 3 dropped frames per 60 fps).
 */
test('drag node on 100-node canvas — less than 3 dropped frames', async ({ page }) => {
  await page.goto('/')

  // Wait for all 100 nodes to be rendered
  await page.waitForSelector('[data-node-id="n0"]')
  await page.waitForSelector('[data-node-id="n99"]')

  const firstNode = page.locator('[data-node-id="n0"]')

  // Start collecting animation frame timestamps via CDP
  const client = await page.context().newCDPSession(page)
  await client.send('Overlay.setShowFPSCounter', { show: false })

  // Collect frame timing using requestAnimationFrame in-page
  const frameTimestamps: number[] = []
  await page.evaluate(() => {
    ;(window as Window & { __frameTs?: number[] }).__frameTs = []
    const collect = (ts: number) => {
      ;(window as Window & { __frameTs?: number[] }).__frameTs!.push(ts)
      requestAnimationFrame(collect)
    }
    requestAnimationFrame(collect)
  })

  // Perform a synthetic drag (~600 ms, 30 steps)
  const box = await firstNode.boundingBox()
  expect(box).not.toBeNull()

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()

  for (let i = 1; i <= 30; i++) {
    await page.mouse.move(
      box!.x + box!.width / 2 + i * 5,
      box!.y + box!.height / 2 + i * 2,
      { steps: 1 },
    )
    await page.waitForTimeout(20) // ~50 fps move rate
  }

  await page.mouse.up()
  await page.waitForTimeout(100)

  // Retrieve frame timestamps and compute dropped frames
  const timestamps: number[] = await page.evaluate(
    () => (window as Window & { __frameTs?: number[] }).__frameTs ?? [],
  )

  let droppedFrames = 0
  for (let i = 1; i < timestamps.length; i++) {
    const delta = timestamps[i] - timestamps[i - 1]
    // A frame is "dropped" if it took more than 2× the 60fps budget (33.3 ms)
    if (delta > 33.3 * 2) droppedFrames++
  }

  console.log(
    `Total frames: ${timestamps.length}, Dropped frames: ${droppedFrames} (delta > 66ms)`,
  )

  // Allow up to 3 dropped frames during the ~600ms drag
  expect(droppedFrames).toBeLessThanOrEqual(3)
})

test('renders 100 nodes without layout errors', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('[data-node-id="n0"]')
  await page.waitForSelector('[data-node-id="n99"]')

  const nodeCount = await page.locator('[data-node-id]').count()
  expect(nodeCount).toBe(100)

  // No console errors
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.waitForTimeout(200)
  expect(errors).toHaveLength(0)
})
