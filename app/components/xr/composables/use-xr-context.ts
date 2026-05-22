import { inject, type ShallowRef } from 'vue'
import type * as BABYLON from '@babylonjs/core'

export function useXRContext() {
  const engine = inject<ShallowRef<BABYLON.Engine | null>>('xr-engine')
  const scene = inject<ShallowRef<BABYLON.Scene | null>>('xr-scene')
  const xrHelper = inject<ShallowRef<BABYLON.WebXRDefaultExperience | null>>('xr-helper')

  if (!engine || !scene || !xrHelper) {
    console.warn('useXRContext must be used within an <xr-core-provider>')
  }

  return {
    engine,
    scene,
    xrHelper,
  }
}
