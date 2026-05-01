export { createFlowCanvas } from './createFlowCanvas'
export { createNode } from './createNode'
export { createHandle } from './createHandle'
export { createEdges } from './createEdges'
export { createSelection, createLasso } from './createSelection'

export type { CreateFlowCanvasOptions, CreateFlowCanvasResult } from './createFlowCanvas'
export type { CreateNodeOptions, CreateNodeResult } from './createNode'
export type { CreateHandleOptions, CreateHandleResult } from './createHandle'

// Re-export key types from core for consumer convenience
export type {
  Edge,
  Point,
  Rect,
  FlowEngine,
  FlowEvents,
  SerializedGraph,
  CanvasTransform,
} from '@headflow/core'
