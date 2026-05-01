export interface HistoryCommand {
  undo(): void
  redo(): void
}

export interface HistoryManager {
  /** Record a command that has ALREADY been applied. */
  record(cmd: HistoryCommand): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

export function createHistoryManager(): HistoryManager {
  const undoStack: HistoryCommand[] = []
  const redoStack: HistoryCommand[] = []
  let busy = false // prevent re-recording during undo/redo

  return {
    record(cmd) {
      if (busy) return
      undoStack.push(cmd)
      redoStack.length = 0
    },
    undo() {
      const cmd = undoStack.pop()
      if (!cmd) return
      busy = true
      try {
        cmd.undo()
      } finally {
        busy = false
      }
      redoStack.push(cmd)
    },
    redo() {
      const cmd = redoStack.pop()
      if (!cmd) return
      busy = true
      try {
        cmd.redo()
      } finally {
        busy = false
      }
      undoStack.push(cmd)
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() {
      undoStack.length = 0
      redoStack.length = 0
    },
  }
}
