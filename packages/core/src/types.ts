export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
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
  /** When true, wheel → zoom (Ctrl/Cmd+wheel = pinch) and trackpad pan are handled automatically. */
  enableBuiltinPanZoom?: boolean
}

export interface FitViewOptions {
  /** Extra padding around all nodes in viewport pixels. Default: 40 */
  padding?: number
  /** Minimum allowed scale. Default: 0.1 */
  minScale?: number
  /** Maximum allowed scale. Default: 2 */
  maxScale?: number
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
  draftEdgeMove: {
    sourceHandleId: string
    sourceNodeId: string
    /** Canvas-space position of the source handle */
    sourcePt: Point
    /** Canvas-space position of the pointer */
    currentPt: Point
  }
  /** Emitted whenever the selection set changes */
  selectionChanged: { selected: Set<string> }
  /** Emitted on every rAF tick during lasso drag (viewport-space rect) */
  lassoUpdate: { rect: Rect }
  /** Emitted when lasso drag ends (selection has already been updated) */
  lassoEnd: undefined
  /** Emitted after any transform change (setTransform, fitView, panTo, zoomTo, built-in pan/zoom) */
  viewportChanged: CanvasTransform
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
  /** Return the current viewport transform. */
  getViewport(): CanvasTransform
  /** Fit all nodes into the viewport. */
  fitView(options?: FitViewOptions): void
  /** Pan so that the given canvas point is centered in the viewport. */
  panTo(canvasX: number, canvasY: number): void
  /** Zoom to the given scale, optionally anchored at a viewport-space point. */
  zoomTo(scale: number, anchor?: Point): void

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

  // ── History (Undo/Redo) ────────────────────────────────────────────────────
  /** Undo the last recorded action (node move, edge create/delete). */
  undo(): void
  /** Redo the last undone action. */
  redo(): void
  /** True if there is an action to undo. */
  canUndo(): boolean
  /** True if there is an action to redo. */
  canRedo(): boolean

  // ── Selection API ─────────────────────────────────────────────────────────
  /** Select a single node by id (additive). */
  selectNode(nodeId: string): void
  /** Select multiple nodes (additive). */
  selectNodes(nodeIds: string[]): void
  /** Deselect a single node. */
  deselectNode(nodeId: string): void
  /** Clear all selected nodes. */
  clearSelection(): void
  /** Return the set of currently selected node ids. */
  getSelection(): Set<string>
  /**
   * Move all selected nodes by a canvas-space delta.
   * Emits `nodeMoved` for each moved node.
   */
  moveSelectionBy(delta: Point): void

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
