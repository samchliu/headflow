/**
 * Default token values — all overridable via CSS custom properties on any ancestor element.
 *
 * @example Override the accent colour for a specific canvas:
 * ```css
 * .my-canvas { --hf-accent: #f59e0b; }
 * ```
 */
export const TOKEN_DEFAULTS = {
  bgCanvas: '#0d0d0d',
  bgSurface: '#141414',
  borderDefault: '#262626',
  borderAccent: '#6366f1',
  accent: '#6366f1',
  accentAlt: '#10b981',
  edgeColor: '#818cf8',
  edgeSelected: '#f59e0b',
  dotColor: '#2a2a2a',
  dotSize: '24px',
  text: '#f0f0f0',
  muted: '#8a8a8a',
} as const

/** CSS var references — use in inline styles so users can override with CSS. */
export const V = {
  bgCanvas: 'var(--hf-bg-canvas, #0d0d0d)',
  bgSurface: 'var(--hf-bg-surface, #141414)',
  borderDefault: 'var(--hf-border-default, #262626)',
  borderAccent: 'var(--hf-border-accent, #6366f1)',
  accent: 'var(--hf-accent, #6366f1)',
  accentAlt: 'var(--hf-accent-alt, #10b981)',
  edgeColor: 'var(--hf-edge-color, #818cf8)',
  edgeSelected: 'var(--hf-edge-selected, #f59e0b)',
  dotColor: 'var(--hf-dot-color, #2a2a2a)',
  dotSize: 'var(--hf-dot-size, 24px)',
  text: 'var(--hf-text, #f0f0f0)',
  muted: 'var(--hf-muted, #8a8a8a)',
} as const
