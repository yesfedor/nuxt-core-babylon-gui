import { ref } from 'vue'
import type * as BABYLON from '@babylonjs/core'
import { XR_SYSTEM_UI_LAYER } from '../utils/layer-mask'

export interface XRInputBridge {
  pointerPosition: BABYLON.Vector3 | null
  isPinching: boolean
  isTriggerPressed: boolean
}

export function useXR(scene?: BABYLON.Scene, xrHelper?: BABYLON.WebXRDefaultExperience) {
  const isDormant = ref(false)
  const inputBridge = ref<XRInputBridge>({
    pointerPosition: null,
    isPinching: false,
    isTriggerPressed: false,
  })

  // Session State Preservation (Dormant Mode)
  const enterDormantMode = () => {
    isDormant.value = true
    // Transition UI nodes to a dedicated, non-rendered layer mask or detach the camera control.
    // Stop heavy animation or rendering tickers, while preserving local reactive variables (input fields, scrolling offsets).
  }

  const exitDormantMode = () => {
    isDormant.value = false
    // Re-enable and project back onto the XR Camera upon re-entry.
  }

  if (xrHelper) {
    xrHelper.baseExperience.sessionManager.onXRSessionInit.add(() => {
      exitDormantMode()
    })

    xrHelper.baseExperience.sessionManager.onXRSessionEnded.add(() => {
      enterDormantMode()
    })

    // Apply Bitwise Layer Masking for pointer selection
    if (xrHelper.pointerSelection) {
      xrHelper.pointerSelection.pointerSelectionPredicate = (mesh) => {
        return (mesh.layerMask & XR_SYSTEM_UI_LAYER) !== 0
      }
    }

    // XRInputBridge input mapping
    xrHelper.input.onControllerAddedObservable.add((controller) => {
      controller.onMotionControllerInitObservable.add((motionController) => {
        const trigger = motionController.getMainComponent()
        if (trigger) {
          trigger.onButtonStateChangedObservable.add((component) => {
            inputBridge.value.isTriggerPressed = component.pressed
          })
        }
      })
    })
  }

  return {
    isDormant,
    inputBridge,
    enterDormantMode,
    exitDormantMode,
  }
}
