export async function checkWebXRSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.xr) {
    return false
  }
  
  try {
    const isSupported = await navigator.xr.isSessionSupported('immersive-vr')
    return isSupported
  } catch (e) {
    return false
  }
}
