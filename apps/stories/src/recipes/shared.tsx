import type { CSSProperties } from 'react'
import { BaseNode, Handle, tokens as V } from '@headflow/react-ui'

export const T = {
  bg: '#0d0d0d',
  surface: '#141414',
  border: '#262626',
  accent: '#6366f1',
  green: '#10b981',
  amber: '#f59e0b',
  edge: '#818cf8',
  text: '#f0f0f0',
  muted: '#8a8a8a',
  dot: '#2a2a2a',
} as const

/**
 * Reusable demo node — one target handle (left) and one source handle (right).
 * Uses BaseNode + Handle from @headflow/react-ui.
 */
export function SimpleNode({
  id,
  label,
  kind = 'default',
  defaultPosition,
}: {
  id: string
  label: string
  kind?: 'input' | 'default' | 'output'
  defaultPosition: { x: number; y: number }
}) {
  const accent = kind === 'input' ? T.green : kind === 'output' ? T.amber : T.accent

  return (
    <BaseNode nodeId={id} defaultPosition={defaultPosition} accent={accent}>
      <Handle nodeId={id} handleId="input" type="target" position="left" />
      {label}
      <Handle nodeId={id} handleId="output" type="source" position="right" />
    </BaseNode>
  )
}

export const btn: CSSProperties = {
  padding: '5px 14px',
  borderRadius: 6,
  border: `1px solid #444`,
  background: '#1e1e1e',
  color: V.text,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'ui-monospace, monospace',
}

export const toolbar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  background: '#111',
  borderBottom: `1px solid ${T.border}`,
  flexShrink: 0,
}
