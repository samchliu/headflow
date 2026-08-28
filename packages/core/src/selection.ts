import type { Edge, FlowEvents, NodeEntry, Point } from './types'
import type { Emitter } from 'mitt'

/**
 * Manages which nodes AND edges are currently selected (a single unified id set).
 * Lives entirely in core so both adapters share the same selection state.
 * All mutating methods are O(1) except selectMany / hitTest which are O(n).
 */
export function createSelectionManager(
  nodeMap: Map<string, NodeEntry>,
  edgeMap: Map<string, Edge>,
  emitter: Emitter<FlowEvents>,
) {
  const selectedSet = new Set<string>()

  function isSelectable(id: string): boolean {
    return nodeMap.has(id) || edgeMap.has(id)
  }

  function emitChange(): void {
    emitter.emit('selectionChanged', { selected: new Set(selectedSet) })
  }

  const manager = {
    select(id: string): void {
      if (!isSelectable(id) || selectedSet.has(id)) return
      selectedSet.add(id)
      emitChange()
    },

    /** Add multiple node/edge ids to the selection (never clears). */
    selectMany(ids: string[]): void {
      let changed = false
      for (const id of ids) {
        if (isSelectable(id) && !selectedSet.has(id)) {
          selectedSet.add(id)
          changed = true
        }
      }
      if (changed) emitChange()
    },

    /** Toggle a single node/edge id: deselect if already selected, else select. */
    toggle(id: string): void {
      if (selectedSet.has(id)) {
        manager.deselect(id)
      } else {
        manager.select(id)
      }
    },

    deselect(id: string): void {
      if (!selectedSet.delete(id)) return
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

    /** Called by engine when an edge is removed — keeps selection consistent. */
    onEdgeRemoved(edgeId: string): void {
      if (selectedSet.delete(edgeId)) emitChange()
    },

    has(id: string): boolean {
      return selectedSet.has(id)
    },

    size(): number {
      return selectedSet.size
    },
  }

  return manager
}

export type SelectionManager = ReturnType<typeof createSelectionManager>
