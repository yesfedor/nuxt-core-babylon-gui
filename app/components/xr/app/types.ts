import type * as BABYLON from '@babylonjs/core'
import type * as GUI from '@babylonjs/gui'

export type XRNodeType
  // 2D Atoms
  = | '2d-text-block' | '2d-image' | '2d-line' | '2d-multi-line' | '2d-display-grid'
  // 2D Inputs
    | '2d-button' | '2d-checkbox' | '2d-radio-button' | '2d-slider' | '2d-image-based-slider'
    | '2d-input-text' | '2d-input-text-area' | '2d-input-password' | '2d-color-picker' | '2d-virtual-keyboard'
  // 2D Layouts
    | '2d-rectangle' | '2d-ellipse' | '2d-stack-panel' | '2d-grid' | '2d-scroll-viewer'
  // 3D Controls
    | '3d-button' | '3d-mesh-button' | '3d-holographic-button' | '3d-touch-holographic-button'
    | '3d-slider' | '3d-holographic-slate' | '3d-near-menu'
  // 3D Layouts
    | '3d-stack-panel' | '3d-plane-panel' | '3d-cylinder-panel' | '3d-sphere-panel' | '3d-scatter-panel'
    | 'unknown'

export interface XRNode {
  type: XRNodeType
  instance: any
}

export type XRComponentType = XRNode

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    // 2D Atoms
    'xr-2d-text-block': any
    'xr-2d-image': any
    'xr-2d-line': any
    'xr-2d-multi-line': any
    'xr-2d-display-grid': any
    // 2D Inputs
    'xr-2d-button': any
    'xr-2d-checkbox': any
    'xr-2d-radio-button': any
    'xr-2d-slider': any
    'xr-2d-image-based-slider': any
    'xr-2d-input-text': any
    'xr-2d-input-text-area': any
    'xr-2d-input-password': any
    'xr-2d-color-picker': any
    'xr-2d-virtual-keyboard': any
    // 2D Layouts
    'xr-2d-rectangle': any
    'xr-2d-ellipse': any
    'xr-2d-stack-panel': any
    'xr-2d-grid': any
    'xr-2d-scroll-viewer': any
    // 3D Controls
    'xr-3d-button': any
    'xr-3d-mesh-button': any
    'xr-3d-holographic-button': any
    'xr-3d-touch-holographic-button': any
    'xr-3d-slider': any
    'xr-3d-holographic-slate': any
    'xr-3d-near-menu': any
    // 3D Layouts
    'xr-3d-stack-panel': any
    'xr-3d-plane-panel': any
    'xr-3d-cylinder-panel': any
    'xr-3d-sphere-panel': any
    'xr-3d-scatter-panel': any
  }
}
