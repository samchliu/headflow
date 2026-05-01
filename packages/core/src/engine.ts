import mitt from 'mitt'
import { DEFAULT_TRANSFORM, getElementCanvasCenter, getNodeInitialPosition } from './transform'
import { setupDrag } from './drag/index'
import { createSelectionManager } from './selection'
import type {
  CanvasTransform,
  Edge,
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
  const { container, allowSelfLoop = false } = options

  // ── Internal state ─────────────────────────────────────────────────────────

  const emitter = mitt<FlowEvents>()
  const nodeMap = new Map<string, NodeEntry>()
  const handleMap = new Map<string, HandleEntry>() // key: `${nodeId}::${handleId}`
  const handleElToKey = new Map<HTMLElement, string>() // for O(1) removal
  const edgeMap = new Map<string, Edge>()

  let transform: CanvasTransform = { ...DEFAULT_TRANSFORM }

  // ── Selection manager ──────────────────────────────────────────────────────

  const selection = createSelectionManager(nodeMap, emitter)

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
    if (nodeMap.has(nodeId)) return

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
      emitter.emit('edgeDeleted', { edgeId })
    }
  }

  // ── MutationObserver — automatic Vanilla-mode discovery ───────────────────

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
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

  observer.observe(container, { childList: true, subtree: true })

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
  })

  // ── Public FlowEngine ──────────────────────────────────────────────────────

  const engine: FlowEngine = {
    on: emitter.on.bind(emitter) as FlowEngine['on'],
    off: emitter.off.bind(emitter) as FlowEngine['off'],

    // ── CRITICAL GAP FIX: setTransform defers recalcAllHandles to rAF ─────
    // If a drag pointerup fires before the rAF, handle pts will be stale for
    // the current frame but will be correct by the next rAF tick. Adapters
    // that need immediate accuracy should call recalcAllHandles() directly —
    // but for Phase 2 the deferred approach is documented as a known trade-off.
    setTransform(partial) {
      transform = { ...transform, ...partial }
      requestAnimationFrame(recalcAllHandles)
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
      if (!edgeMap.has(edgeId)) return
      edgeMap.delete(edgeId)
      emitter.emit('edgeDeleted', { edgeId })
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
      selection.selectNodes(nodeIds)
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
      const moved = selection.moveSelectionBy(delta, recalcHandlesForNode)
      for (const nodeId of moved) {
        const node = nodeMap.get(nodeId)
        if (node) {
          emitter.emit('nodeMoved', { nodeId, position: { ...node.position } })
        }
      }
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
