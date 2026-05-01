import type { FlowEvents, NodeEntry, Point } from './types'
import type { Emitter } from 'mitt'

/**
 * Manages which nodes are currently selected.
 * Lives entirely in core so both adapters share the same selection state.
 * All mutating methods are O(1) except selectNodes / hitTest which are O(n).
 */
export function createSelectionManager(
  nodeMap: Map<string, NodeEntry>,
  emitter: Emitter<FlowEvents>,
) {
  const selectedSet = new Set<string>()

  function emitChange(): void {
    emitter.emit('selectionChanged', { selected: new Set(selectedSet) })
  }

  const manager = {
    select(nodeId: string): void {
      if (!nodeMap.has(nodeId) || selectedSet.has(nodeId)) return
      selectedSet.add(nodeId)
      emitChange()
    },

    selectNodes(nodeIds: string[]): void {
      let changed = false
      for (const id of nodeIds) {
        if (nodeMap.has(id) && !selectedSet.has(id)) {
          selectedSet.add(id)
          changed = true
        }
      }
      if (changed) emitChange()
    },

    deselect(nodeId: string): void {
      if (!selectedSet.delete(nodeId)) return
      emitChange()
    },

    clearSelection(): void {
      if (selectedSet.size === 0) return
      selectedSet.clear()
      emitChange()
    },

    getSelection(): Set<string> {
      return new Set(selectedSet)
    },

    /**
     * Move all selected nodes by the given delta (canvas space).
     * Updates position + style.transform + recalculates handles for each node.
     * Returns the list of moved nodeIds.
     */
    moveSelectionBy(
      delta: Point,
      recalcHandlesForNode: (id: string) => void,
    ): string[] {
      const moved: string[] = []
      for (const nodeId of selectedSet) {
        const node = nodeMap.get(nodeId)
        if (!node) continue
        node.position = {
          x: node.position.x + delta.x,
          y: node.position.y + delta.y,
        }
        node.el.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`
        recalcHandlesForNode(nodeId)
        moved.push(nodeId)
      }
      return moved
    },

    /** Called by engine when a node is removed — keeps selection consistent. */
    onNodeRemoved(nodeId: string): void {
      if (selectedSet.delete(nodeId)) emitChange()
    },

    has(nodeId: string): boolean {
      return selectedSet.has(nodeId)
    },

    size(): number {
      return selectedSet.size
    },
  }

  return manager
}

export type SelectionManager = ReturnType<typeof createSelectionManager>
