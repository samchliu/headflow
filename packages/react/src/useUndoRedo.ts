import { useCallback, useEffect, useState } from 'react'
import { useFlowContext } from './context'

export interface UseUndoRedoResult {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

/**
 * Exposes undo/redo controls and their availability, kept in sync automatically
 * whenever nodes are moved or edges are created/deleted.
 *
 * @example
 * ```tsx
 * const { undo, redo, canUndo, canRedo } = useUndoRedo()
 * <button onClick={undo} disabled={!canUndo}>Undo</button>
 * <button onClick={redo} disabled={!canRedo}>Redo</button>
 * ```
 */
export function useUndoRedo(): UseUndoRedoResult {
  const { getEngine } = useFlowContext()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    const engine = getEngine()

    function sync() {
      setCanUndo(engine.canUndo())
      setCanRedo(engine.canRedo())
    }

    sync()
    engine.on('nodeMoved', sync)
    engine.on('edgeCreated', sync)
    engine.on('edgeDeleted', sync)

    return () => {
      engine.off('nodeMoved', sync)
      engine.off('edgeCreated', sync)
      engine.off('edgeDeleted', sync)
    }
  // getEngine is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const undo = useCallback(() => {
    const engine = getEngine()
    engine.undo()
    setCanUndo(engine.canUndo())
    setCanRedo(engine.canRedo())
  }, [getEngine])

  const redo = useCallback(() => {
    const engine = getEngine()
    engine.redo()
    setCanUndo(engine.canUndo())
    setCanRedo(engine.canRedo())
  }, [getEngine])

  return { undo, redo, canUndo, canRedo }
}
