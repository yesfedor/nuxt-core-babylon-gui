// Lightweight scoped logger. Gated by Vite env var so it can be flipped per
// build/runtime without touching code:
//
//   export VITE_XR_DEBUG=true   # *nix
//   $env:VITE_XR_DEBUG = 'true' # PowerShell
//
// (Vite only exposes vars prefixed with `VITE_` to client code.)

type EnvBag = Record<string, string | boolean | undefined>

function readFlag(name: string): boolean {
  const env = (import.meta as unknown as { env?: EnvBag }).env
  const raw = env?.[name]
  if (raw === true) return true
  if (typeof raw === 'string') return raw === 'true' || raw === '1'
  return false
}

export interface ScopedLogger {
  enabled: boolean
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  group: (label: string, body: () => void) => void
}

/**
 * Creates a tagged logger. When the env flag is falsy, log/warn become no-ops
 * (zero overhead at call-site). `error` always fires regardless of flag.
 */
export function createLogger(tag: string, envFlag: string): ScopedLogger {
  const enabled = readFlag(envFlag)
  const prefix = `[${tag}]`
  const noop = (): void => {}

  return {
    enabled,
    log: enabled ? console.log.bind(console, prefix) : noop,
    warn: enabled ? console.warn.bind(console, prefix) : noop,
    error: console.error.bind(console, prefix),
    group: enabled
      ? (label, body) => {
          console.groupCollapsed(`${prefix} ${label}`)
          try {
            body()
          } finally {
            console.groupEnd()
          }
        }
      : (_label, body) => body(),
  }
}

/**
 * Shared logger for the XR custom renderer pipeline. Toggle with VITE_XR_DEBUG.
 */
export const xrLogger: ScopedLogger = createLogger('xr', 'VITE_XR_DEBUG')
