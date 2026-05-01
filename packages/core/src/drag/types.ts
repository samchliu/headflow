import type { CanvasTransform, Edge, HandleEntry, NodeEntry, Point, Rect } from '../types'
import type { SelectionManager } from '../selection'

export interface DragContext {
  container: HTMLElement
  nodeMap: Map<string, NodeEntry>
  handleMap: Map<string, HandleEntry>
  edgeMap: Map<string, Edge>
  getTransform: () => CanvasTransform
  emit: <T>(event: string, data: T) => void
  recalcHandlesForNode: (nodeId: string) => void
  selection: SelectionManager
  options: DragOptions
}

export interface DragOptions {
  allowSelfLoop: boolean
}

export type NodeDragState = {
  type: 'node'
  nodeId: string
  el: HTMLElement
  startPointerX: number
  startPointerY: number
  startNodeX: number
  startNodeY: number
}

export type EdgeDragState = {
  type: 'edge'
  sourceNodeId: string
  sourceHandleId: string
}

export type LassoDragState = {
  type: 'lasso'
  /** Viewport-relative start point (relative to canvas container top-left) */
  startX: number
  startY: number
  /** Whether shift key was held — appends to existing selection */
  appendMode: boolean
}

export type DragState = NodeDragState | EdgeDragState | LassoDragState | null
