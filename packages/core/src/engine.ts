import mitt from 'mitt'
import { DEFAULT_TRANSFORM, getElementCanvasCenter, getNodeInitialPosition } from './transform'
import { setupDrag } from './drag/index'
import { setupKeyboard } from './keyboard'
import { createSelectionManager } from './selection'
import { createHistoryManager } from './history'
import { setupPanZoom } from './panzoom'
import type {
  CanvasTransform,
  Edge,
  FitViewOptions,
  FlowEngine,
  FlowEvents,
  FlowOptions,
  HandleEntry,
  HandleType,
  NodeEntry,
  Point,
  SerializedGraph,
} from './types'

export function createFlow(options: FlowOptions): FlowEngine {
  const { container, allowSelfLoop = false, enableBuiltinPanZoom = false } = options

  // ── Internal state ─────────────────────────────────────────────────────────

  const emitter = mitt<FlowEvents>()
  const nodeMap = new Map<string, NodeEntry>()
  const handleMap = new Map<string, HandleEntry>() // key: `${nodeId}::${handleId}`
  const handleElToKey = new Map<HTMLElement, string>() // for O(1) removal
  const edgeMap = new Map<string, Edge>()

  let transform: CanvasTransform = { ...DEFAULT_TRANSFORM }

  // ── Selection manager ──────────────────────────────────────────────────────

  const selection = createSelectionManager(nodeMap, edgeMap, emitter)

  // ── History manager ────────────────────────────────────────────────────────

  const history = createHistoryManager()

  // ── Position helpers ───────────────────────────────────────────────────────

  function recalcHandlesForNode(nodeId: string): void {
    for (const handle of handleMap.values()) {
      if (handle.nodeId !== nodeId) continue
      handle.pt = getElementCanvasCenter(handle.el, container, transform)
    }
    // Keep edge pts in sync
    for (const edge of edgeMap.values()) {
      if (edge.source.nodeId === nodeId) {
        const h = handleMap.get(`${nodeId}::${edge.source.handleId}`)
        if (h) edge.source.pt = { ...h.pt }
      }
      if (edge.target.nodeId === nodeId) {
        const h = handleMap.get(`${nodeId}::${edge.target.handleId}`)
        if (h) edge.target.pt = { ...h.pt }
      }
    }
  }

  function recalcAllHandles(): void {
    for (const nodeId of nodeMap.keys()) {
      recalcHandlesForNode(nodeId)
    }
  }

  // ── Node registration ──────────────────────────────────────────────────────

  function registerNodeEl(el: HTMLElement, position?: Point): void {
    const nodeId = el.getAttribute('data-flow-node')
    if (!nodeId) return
    const existing = nodeMap.get(nodeId)
    if (existing) {
      if (position) {
        existing.el = el
        existing.position = { ...position }
        existing.el.style.transform = `translate(${position.x}px, ${position.y}px)`
        recalcHandlesForNode(nodeId)
      }
      return
    }

    const pos = position ?? getNodeInitialPosition(el)

    if (!el.style.transform) {
      el.style.transform = `translate(${pos.x}px, ${pos.y}px)`
    }

    nodeMap.set(nodeId, { el, position: pos })
    emitter.emit('nodeAdded', { nodeId })
  }

  function registerHandleEl(el: HTMLElement): void {
    const handleType = el.getAttribute('data-flow-handle') as HandleType | null
    if (!handleType || (handleType !== 'source' && handleType !== 'target')) return

    const handleId = el.getAttribute('data-flow-handle-id')
    if (!handleId) return

    const nodeEl = el.closest('[data-flow-node]') as HTMLElement | null
    const nodeId = nodeEl?.getAttribute('data-flow-node')
    if (!nodeId) return

    const key = `${nodeId}::${handleId}`
    if (handleMap.has(key)) return

    const pt = getElementCanvasCenter(el, container, transform)
    const entry: HandleEntry = { el, nodeId, type: handleType, pt }
    handleMap.set(key, entry)
    handleElToKey.set(el, key)
  }

  // ── Node removal ───────────────────────────────────────────────────────────

  function unregisterNodeById(nodeId: string): void {
    if (!nodeMap.has(nodeId)) return
    nodeMap.delete(nodeId)

    // Remove from selection first (before emitting nodeRemoved)
    selection.onNodeRemoved(nodeId)

    const keysToRemove: string[] = []
    for (const key of handleMap.keys()) {
      if (key.startsWith(`${nodeId}::`)) keysToRemove.push(key)
    }

    for (const key of keysToRemove) {
      const handle = handleMap.get(key)!
      handleElToKey.delete(handle.el)
      handleMap.delete(key)
      const [, handleId] = key.split('::')
      removeEdgesForHandle(nodeId, handleId)
    }

    emitter.emit('nodeRemoved', { nodeId })
  }

  // ── CRITICAL GAP FIX: unregisterHandle must cascade-delete edges ──────────

  function removeEdgesForHandle(nodeId: string, handleId: string): void {
    const toDelete: string[] = []
    for (const [edgeId, edge] of edgeMap) {
      if (
        (edge.source.nodeId === nodeId && edge.source.handleId === handleId) ||
        (edge.target.nodeId === nodeId && edge.target.handleId === handleId)
      ) {
        toDelete.push(edgeId)
      }
    }
    for (const edgeId of toDelete) {
      edgeMap.delete(edgeId)
      selection.onEdgeRemoved(edgeId)
      emitter.emit('edgeDeleted', { edgeId })
    }
  }

  function cloneEdge(edge: Edge): Edge {
    return {
      ...edge,
      source: { ...edge.source, pt: { ...edge.source.pt } },
      target: { ...edge.target, pt: { ...edge.target.pt } },
    }
  }

  /**
   * Shared deletion primitive for `removeNode`/`deleteSelection`: cascades
   * edge deletion for the given node ids (plus any directly-specified edge
   * ids), cleans up selection, and records ONE undo entry for the whole
   * batch (mirrors `moveSelectionBy`'s batching — one user action, one undo).
   * Emits `nodeRemoveRequested` per node so the consuming app can unmount it.
   */
  function deleteNodesAndEdges(nodeIds: string[], edgeIds: string[]): void {
    const edgeIdsToRemove = new Set<string>(edgeIds)
    for (const [edgeId, edge] of edgeMap) {
      if (nodeIds.includes(edge.source.nodeId) || nodeIds.includes(edge.target.nodeId)) {
        edgeIdsToRemove.add(edgeId)
      }
    }

    const edgeSnapshots: Edge[] = []
    for (const edgeId of edgeIdsToRemove) {
      const edge = edgeMap.get(edgeId)
      if (edge) edgeSnapshots.push(cloneEdge(edge))
    }

    const nodePositions = new Map<string, Point>()
    for (const nodeId of nodeIds) {
      const node = nodeMap.get(nodeId)
      if (node) nodePositions.set(nodeId, { ...node.position })
    }

    function applyRemoval(): void {
      for (const snap of edgeSnapshots) {
        if (!edgeMap.has(snap.id)) continue
        edgeMap.delete(snap.id)
        selection.onEdgeRemoved(snap.id)
        emitter.emit('edgeDeleted', { edgeId: snap.id })
      }
      for (const nodeId of nodeIds) {
        selection.onNodeRemoved(nodeId)
        emitter.emit('nodeRemoveRequested', { nodeId })
      }
    }

    function applyRestore(): void {
      for (const snap of edgeSnapshots) {
        if (edgeMap.has(snap.id)) continue
        edgeMap.set(snap.id, snap)
        emitter.emit('edgeCreated', { edge: snap })
      }
      for (const [nodeId, position] of nodePositions) {
        emitter.emit('nodeRestoreRequested', { nodeId, position })
      }
    }

    history.record({ undo: applyRestore, redo: applyRemoval })
    applyRemoval()
  }

  // ── MutationObserver — automatic Vanilla-mode discovery ───────────────────

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target as HTMLElement
        if (target.hasAttribute('data-flow-node')) {
          registerNodeEl(target)
          target.querySelectorAll<HTMLElement>('[data-flow-handle]').forEach((el) => {
            registerHandleEl(el)
          })
        }
        if (target.hasAttribute('data-flow-handle')) {
          registerHandleEl(target)
        }
      }

      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        if (node.hasAttribute('data-flow-node')) registerNodeEl(node)
        if (node.hasAttribute('data-flow-handle')) registerHandleEl(node)
        node.querySelectorAll<HTMLElement>('[data-flow-node]').forEach((el) =>
          registerNodeEl(el),
        )
        node.querySelectorAll<HTMLElement>('[data-flow-handle]').forEach((el) =>
          registerHandleEl(el),
        )
      }

      for (const node of mutation.removedNodes) {
        if (!(node instanceof HTMLElement)) continue

        if (node.hasAttribute('data-flow-node')) {
          unregisterNodeById(node.getAttribute('data-flow-node')!)
        }
        if (node.hasAttribute('data-flow-handle')) {
          const key = handleElToKey.get(node)
          if (key) {
            handleElToKey.delete(node)
            handleMap.delete(key)
            const [nodeId, handleId] = key.split('::')
            removeEdgesForHandle(nodeId, handleId)
          }
        }

        node.querySelectorAll<HTMLElement>('[data-flow-node]').forEach((el) => {
          unregisterNodeById(el.getAttribute('data-flow-node')!)
        })
        node.querySelectorAll<HTMLElement>('[data-flow-handle]').forEach((el) => {
          const key = handleElToKey.get(el)
          if (key) {
            handleElToKey.delete(el)
            handleMap.delete(key)
            const [nodeId, handleId] = key.split('::')
            removeEdgesForHandle(nodeId, handleId)
          }
        })
      }
    }
  })

  // Initial scan for pre-existing DOM nodes (Vanilla mode)
  container.querySelectorAll<HTMLElement>('[data-flow-node]').forEach((el) =>
    registerNodeEl(el),
  )
  container.querySelectorAll<HTMLElement>('[data-flow-handle]').forEach((el) =>
    registerHandleEl(el),
  )

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-flow-node', 'data-flow-handle', 'data-flow-handle-id'],
  })

  // ── Drag setup ─────────────────────────────────────────────────────────────

  const cleanupDrag = setupDrag({
    container,
    nodeMap,
    handleMap,
    edgeMap,
    getTransform: () => transform,
    emit: (event, data) =>
      (emitter.emit as (type: string, data: unknown) => void)(event, data),
    recalcHandlesForNode,
    selection,
    options: { allowSelfLoop },
    history,
  })

  // ── Keyboard setup (Delete/Backspace removes the current selection) ──────

  const cleanupKeyboard = setupKeyboard({
    container,
    deleteSelection: () => engine.deleteSelection(),
  })

  // ── Built-in pan/zoom (optional) ───────────────────────────────────────────

  const cleanupPanZoom = enableBuiltinPanZoom
    ? setupPanZoom(container, () => transform, applyTransform)
    : null

  // ── Transform helpers ──────────────────────────────────────────────────────

  /**
   * Apply a partial transform update, defer handle recalculation to the next
   * rAF (avoids race conditions with in-flight drags), and emit viewportChanged.
   */
  function applyTransform(partial: Partial<CanvasTransform>): void {
    transform = { ...transform, ...partial }
    requestAnimationFrame(recalcAllHandles)
    emitter.emit('viewportChanged', { ...transform })
  }

  // ── Public FlowEngine ──────────────────────────────────────────────────────

  const engine: FlowEngine = {
    on: emitter.on.bind(emitter) as FlowEngine['on'],
    off: emitter.off.bind(emitter) as FlowEngine['off'],

    // ── CRITICAL GAP FIX: setTransform defers recalcAllHandles to rAF ─────
    setTransform(partial) {
      applyTransform(partial)
    },

    // ── Viewport API ──────────────────────────────────────────────────────

    getViewport() {
      return { ...transform }
    },

    fitView(opts: FitViewOptions = {}) {
      const { padding = 40, minScale = 0.1, maxScale = 2 } = opts
      const nodes = [...nodeMap.values()]
      if (nodes.length === 0) return

      // Bounding box in canvas space
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const node of nodes) {
        const w = node.el.offsetWidth || 80
        const h = node.el.offsetHeight || 40
        if (node.position.x < minX) minX = node.position.x
        if (node.position.y < minY) minY = node.position.y
        if (node.position.x + w > maxX) maxX = node.position.x + w
        if (node.position.y + h > maxY) maxY = node.position.y + h
      }

      const contentW = maxX - minX
      const contentH = maxY - minY
      const viewW = container.clientWidth || 800
      const viewH = container.clientHeight || 600

      const scale = Math.min(
        maxScale,
        Math.max(minScale, Math.min(
          (viewW - padding * 2) / (contentW || 1),
          (viewH - padding * 2) / (contentH || 1),
        )),
      )

      // Center the content
      const translateX = (viewW - contentW * scale) / 2 - minX * scale
      const translateY = (viewH - contentH * scale) / 2 - minY * scale

      applyTransform({ scale, translateX, translateY })
    },

    panTo(canvasX, canvasY) {
      const viewW = container.clientWidth || 800
      const viewH = container.clientHeight || 600
      applyTransform({
        translateX: viewW / 2 - canvasX * transform.scale,
        translateY: viewH / 2 - canvasY * transform.scale,
      })
    },

    zoomTo(newScale, anchor) {
      const viewW = container.clientWidth || 800
      const viewH = container.clientHeight || 600
      const anchorX = anchor?.x ?? viewW / 2
      const anchorY = anchor?.y ?? viewH / 2

      // Keep the anchor point fixed in viewport space
      const canvasX = (anchorX - transform.translateX) / transform.scale
      const canvasY = (anchorY - transform.translateY) / transform.scale

      applyTransform({
        scale: newScale,
        translateX: anchorX - canvasX * newScale,
        translateY: anchorY - canvasY * newScale,
      })
    },

    setNodePosition(nodeId, position) {
      const node = nodeMap.get(nodeId)
      if (!node) return
      node.position = { ...position }
      node.el.style.transform = `translate(${position.x}px, ${position.y}px)`
      recalcHandlesForNode(nodeId)
      emitter.emit('nodeMoved', { nodeId, position: { ...position } })
    },

    removeEdge(edgeId) {
      const edge = edgeMap.get(edgeId)
      if (!edge) return

      // Record for undo BEFORE deleting
      const snapshot = cloneEdge(edge)
      history.record({
        undo() {
          if (edgeMap.has(snapshot.id)) return
          edgeMap.set(snapshot.id, snapshot)
          emitter.emit('edgeCreated', { edge: snapshot })
        },
        redo() {
          if (!edgeMap.has(snapshot.id)) return
          edgeMap.delete(snapshot.id)
          selection.onEdgeRemoved(snapshot.id)
          emitter.emit('edgeDeleted', { edgeId: snapshot.id })
        },
      })

      edgeMap.delete(edgeId)
      selection.onEdgeRemoved(edgeId)
      emitter.emit('edgeDeleted', { edgeId })
    },

    removeNode(nodeId) {
      if (!nodeMap.has(nodeId)) return
      deleteNodesAndEdges([nodeId], [])
    },

    deleteSelection() {
      const selected = selection.getSelection()
      if (selected.size === 0) return
      const nodeIds = [...selected].filter((id) => nodeMap.has(id))
      const edgeIds = [...selected].filter((id) => edgeMap.has(id))
      if (nodeIds.length === 0 && edgeIds.length === 0) return
      deleteNodesAndEdges(nodeIds, edgeIds)
    },

    getEdges() {
      return Array.from(edgeMap.values()).map((e) => ({
        ...e,
        source: { ...e.source, pt: { ...e.source.pt } },
        target: { ...e.target, pt: { ...e.target.pt } },
      }))
    },

    serialize() {
      const nodes: SerializedGraph['nodes'] = []
      for (const [id, node] of nodeMap) {
        nodes.push({ id, position: { ...node.position } })
      }
      const edges: SerializedGraph['edges'] = []
      for (const [id, edge] of edgeMap) {
        edges.push({
          id,
          source: { nodeId: edge.source.nodeId, handleId: edge.source.handleId },
          target: { nodeId: edge.target.nodeId, handleId: edge.target.handleId },
        })
      }
      return { nodes, edges }
    },

    restore(state) {
      for (const { id, position } of state.nodes) {
        engine.setNodePosition(id, position)
      }

      const existing = Array.from(edgeMap.keys())
      for (const edgeId of existing) {
        edgeMap.delete(edgeId)
        selection.onEdgeRemoved(edgeId)
        emitter.emit('edgeDeleted', { edgeId })
      }

      for (const { id, source, target } of state.edges) {
        const srcHandle = handleMap.get(`${source.nodeId}::${source.handleId}`)
        const tgtHandle = handleMap.get(`${target.nodeId}::${target.handleId}`)
        if (!srcHandle || !tgtHandle) continue

        const edge: Edge = {
          id,
          source: { ...source, pt: { ...srcHandle.pt } },
          target: { ...target, pt: { ...tgtHandle.pt } },
        }
        edgeMap.set(id, edge)
        emitter.emit('edgeCreated', { edge })
      }
    },

    destroy() {
      observer.disconnect()
      cleanupDrag()
      cleanupKeyboard()
      cleanupPanZoom?.()
      history.clear()
      emitter.all.clear()
      nodeMap.clear()
      handleMap.clear()
      handleElToKey.clear()
      edgeMap.clear()
    },

    // ── Selection API ────────────────────────────────────────────────────────

    selectNode(nodeId) {
      selection.select(nodeId)
    },

    selectNodes(nodeIds) {
      selection.selectMany(nodeIds)
    },

    deselectNode(nodeId) {
      selection.deselect(nodeId)
    },

    clearSelection() {
      selection.clearSelection()
    },

    getSelection() {
      return selection.getSelection()
    },

    moveSelectionBy(delta) {
      // Snapshot before-positions for undo recording
      const prevPositions = new Map<string, Point>()
      for (const id of selection.getSelection()) {
        const node = nodeMap.get(id)
        if (node) prevPositions.set(id, { ...node.position })
      }

      const moved = selection.moveSelectionBy(delta, recalcHandlesForNode)
      for (const nodeId of moved) {
        const node = nodeMap.get(nodeId)
        if (node) {
          emitter.emit('nodeMoved', { nodeId, position: { ...node.position } })
        }
      }

      // Record in history
      if (prevPositions.size > 0) {
        const nextPositions = new Map<string, Point>()
        for (const [id] of prevPositions) {
          const node = nodeMap.get(id)
          if (node) nextPositions.set(id, { ...node.position })
        }
        history.record({
          undo() {
            for (const [id, prev] of prevPositions) {
              const node = nodeMap.get(id)
              if (!node) continue
              node.position = { ...prev }
              node.el.style.transform = `translate(${prev.x}px, ${prev.y}px)`
              recalcHandlesForNode(id)
              emitter.emit('nodeMoved', { nodeId: id, position: { ...prev } })
            }
          },
          redo() {
            for (const [id, next] of nextPositions) {
              const node = nodeMap.get(id)
              if (!node) continue
              node.position = { ...next }
              node.el.style.transform = `translate(${next.x}px, ${next.y}px)`
              recalcHandlesForNode(id)
              emitter.emit('nodeMoved', { nodeId: id, position: { ...next } })
            }
          },
        })
      }
    },

    // ── History API ──────────────────────────────────────────────────────────

    undo() {
      history.undo()
    },

    redo() {
      history.redo()
    },

    canUndo() {
      return history.canUndo()
    },

    canRedo() {
      return history.canRedo()
    },

    // ── Adapter-facing ───────────────────────────────────────────────────────

    registerNode(nodeId, el, initialPosition) {
      if (!el.hasAttribute('data-flow-node')) {
        el.setAttribute('data-flow-node', nodeId)
      }
      registerNodeEl(el, initialPosition)
    },

    unregisterNode(nodeId) {
      const node = nodeMap.get(nodeId)
      if (node) node.el.removeAttribute('data-flow-node')
      unregisterNodeById(nodeId)
    },

    registerHandle(nodeId, handleId, type, el) {
      if (!el.hasAttribute('data-flow-handle')) {
        el.setAttribute('data-flow-handle', type)
      }
      if (!el.hasAttribute('data-flow-handle-id')) {
        el.setAttribute('data-flow-handle-id', handleId)
      }
      registerHandleEl(el)
    },

    unregisterHandle(nodeId, handleId) {
      const key = `${nodeId}::${handleId}`
      const handle = handleMap.get(key)
      if (!handle) return
      handleElToKey.delete(handle.el)
      handleMap.delete(key)
      // Critical: cascade delete edges connected to this handle
      removeEdgesForHandle(nodeId, handleId)
    },
  }

  return engine
}
