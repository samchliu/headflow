export interface Point {
  x: number
  y: number
}

export interface CanvasTransform {
  scale: number
  translateX: number
  translateY: number
}

export type HandleType = 'source' | 'target'

export interface NodeEntry {
  el: HTMLElement
  position: Point
}

export interface HandleEntry {
  el: HTMLElement
  nodeId: string
  type: HandleType
  pt: Point
}

export interface Edge {
  id: string
  source: {
    nodeId: string
    handleId: string
    pt: Point
  }
  target: {
    nodeId: string
    handleId: string
    pt: Point
  }
}

export interface SerializedGraph {
  nodes: Array<{
    id: string
    position: Point
  }>
  edges: Array<{
    id: string
    source: { nodeId: string; handleId: string }
    target: { nodeId: string; handleId: string }
  }>
}

export interface FlowOptions {
  container: HTMLElement
  allowSelfLoop?: boolean
  enableBuiltinPanZoom?: boolean
}

export type FlowEvents = {
  nodeAdded: { nodeId: string }
  nodeRemoved: { nodeId: string }
  /** Emitted during drag (live) and on pointerup (final) */
  nodeMoved: { nodeId: string; position: Point }
  edgeCreated: { edge: Edge }
  edgeDeleted: { edgeId: string }
  edgeCreateCancelled: { sourceHandleId: string; sourceNodeId: string }
  /** rAF-throttled — emitted during edge drag to show a draft edge */
  draftEdgeMove: { sourceHandleId: string; sourceNodeId: string; currentPt: Point }
}

export interface FlowEngine {
  on<K extends keyof FlowEvents>(
    type: K,
    handler: (event: FlowEvents[K]) => void,
  ): void
  off<K extends keyof FlowEvents>(
    type: K,
    handler: (event: FlowEvents[K]) => void,
  ): void

  /** Notify lib of a new canvas transform (zoom/pan). */
  setTransform(transform: Partial<CanvasTransform>): void
  /** Programmatically move a node (e.g. after restore()). */
  setNodePosition(nodeId: string, position: Point): void
  /** Remove an edge by id. */
  removeEdge(edgeId: string): void
  /** Return a snapshot of all current edges (with live pt coordinates). */
  getEdges(): Edge[]
  /** Serialize graph state (positions + edge topology, no pts). */
  serialize(): SerializedGraph
  /** Restore a previously serialized graph state. */
  restore(state: SerializedGraph): void
  /** Remove all event listeners and DOM observers. Must be called on unmount. */
  destroy(): void

  // ── Adapter-facing (used by framework adapters, not end-users) ─────────────
  /** @internal Register a DOM element as a node. */
  registerNode(nodeId: string, el: HTMLElement, initialPosition?: Point): void
  /** @internal Unregister a node (and its handles). */
  unregisterNode(nodeId: string): void
  /** @internal Register a DOM element as a handle. */
  registerHandle(
    nodeId: string,
    handleId: string,
    type: HandleType,
    el: HTMLElement,
  ): void
  /** @internal Unregister a handle. */
  unregisterHandle(nodeId: string, handleId: string): void
}
