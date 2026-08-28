export interface KeyboardContext {
  container: HTMLElement
  deleteSelection: () => void
}

/**
 * Wires Delete/Backspace to remove the current selection. Attached to the
 * canvas container (not `document`), matching the existing pointer-event
 * convention in `drag/index.ts` — the container must be focusable
 * (`tabIndex`) for these to fire.
 */
export function setupKeyboard(ctx: KeyboardContext): () => void {
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return

    // Don't hijack Backspace/Delete while the user is typing inside a node
    // (e.g. an editable label input) — only handle it when the keydown
    // originated from the container itself or a non-editable descendant.
    const target = e.target as HTMLElement | null
    if (target) {
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
    }

    ctx.deleteSelection()
  }

  ctx.container.addEventListener('keydown', onKeyDown)

  return () => {
    ctx.container.removeEventListener('keydown', onKeyDown)
  }
}
