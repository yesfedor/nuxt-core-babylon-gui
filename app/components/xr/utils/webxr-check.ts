export type XRSessionMode = 'immersive-ar' | 'immersive-vr'

export interface XRSupport {
  ar: boolean
  vr: boolean
}

async function isSessionSupported(mode: XRSessionMode): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.xr) return false
  try {
    return await navigator.xr.isSessionSupported(mode)
  } catch {
    return false
  }
}

/**
 * Probes the platform for immersive-ar and immersive-vr support. Browsers that
 * lack WebXR entirely resolve to `{ ar: false, vr: false }`.
 */
export async function detectXRSupport(): Promise<XRSupport> {
  const [ar, vr] = await Promise.all([
    isSessionSupported('immersive-ar'),
    isSessionSupported('immersive-vr'),
  ])
  return { ar, vr }
}

/**
 * Resolves to the preferred session mode for the current platform.
 * Order: immersive-ar (passthrough) → immersive-vr → null (unsupported).
 */
export async function resolvePreferredXRMode(): Promise<XRSessionMode | null> {
  const support = await detectXRSupport()
  if (support.ar) return 'immersive-ar'
  if (support.vr) return 'immersive-vr'
  return null
}

/**
 * Back-compat alias retained for callers that only need a boolean.
 */
export async function checkWebXRSupport(): Promise<boolean> {
  const mode = await resolvePreferredXRMode()
  return mode !== null
}
