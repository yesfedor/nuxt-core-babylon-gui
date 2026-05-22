import type * as BABYLON from '@babylonjs/core'

export const XR_WORLD_LAYER = 0x00000001
export const XR_SYSTEM_UI_LAYER = 0x10000000
export const XR_HUD_LAYER = 0x20000000

export function blockRayPassThrough(_eventData: unknown, eventState: BABYLON.EventState | undefined): void {
  if (eventState) {
    eventState.skipNextObservers = true
  }
}
