import type * as BABYLON from '@babylonjs/core'
import type * as GUI from '@babylonjs/gui'
import type { AnyPoolableControl, XRNodePool } from '../utils/xr-pool'

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

export type XRInstance = GUI.Control | GUI.Control3D | BABYLON.TransformNode | BABYLON.Mesh | null

export interface XRObserverHandle {
  observable: BABYLON.Observable<unknown>
  observer: BABYLON.Observer<unknown>
}

export interface XRRootContainer {
  __isXRRoot: true
  gui3DManager: GUI.GUI3DManager
  /**
   * Lazy fullscreen ADT for 2D controls placed directly at the XR root.
   * Stays `null` while no such child exists — a permanent fullscreen ADT in a
   * WebXR session renders twice per frame (one pass per eye) and pegs the
   * GPU even when empty.
   */
  advancedTexture: GUI.AdvancedDynamicTexture | null
  /** Factory invoked the first time the renderer needs the fullscreen ADT. */
  ensureAdvancedTexture: () => GUI.AdvancedDynamicTexture
  scene: BABYLON.Scene
}

export type XRParent = XRNode | XRRootContainer | null | undefined

export interface XRNode {
  type: XRNodeType
  instance: XRInstance
  parent?: XRParent
  nodeType?: 'element' | 'text' | 'comment'
  text?: string
  isFragment?: boolean
  _observers?: Map<string, XRObserverHandle>
  _billboardMode?: number
  _followBehavior?: BABYLON.FollowBehavior | null
  _pool?: XRNodePool<AnyPoolableControl> | null
  _wrapperMesh?: BABYLON.Mesh | null
  _wrapperADT?: GUI.AdvancedDynamicTexture | null
  _wrapperMeshButton?: GUI.MeshButton3D | null
  _pendingSlateContent?: GUI.Control | null
  // Vector props (position/rotation/scale/dimensions/minDimensions) parked
  // until the underlying Babylon node exists. Re-applied after the control is
  // attached to its host (GUI3DManager or AdvancedDynamicTexture).
  _pendingVectorProps?: Map<string, number[]>
  // Children whose 3D parent was not yet attached to GUI3DManager when they
  // mounted (depth-first traversal). Container3D.addControl would crash on a
  // null `_host` — drained after the parent itself attaches.
  _pendingChildren?: XRNode[]
}

export function isXRRootContainer(node: unknown): node is XRRootContainer {
  return !!node && typeof node === 'object' && (node as { __isXRRoot?: boolean }).__isXRRoot === true
}

export type XRComponentType = XRNode

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    // 2D Atoms
    'xr-2d-text-block': GUI.TextBlock
    'xr-2d-image': GUI.Image
    'xr-2d-line': GUI.Line
    'xr-2d-multi-line': GUI.MultiLine
    'xr-2d-display-grid': GUI.DisplayGrid
    // 2D Inputs
    'xr-2d-button': GUI.Button
    'xr-2d-checkbox': GUI.Checkbox
    'xr-2d-radio-button': GUI.RadioButton
    'xr-2d-slider': GUI.Slider
    'xr-2d-image-based-slider': GUI.ImageBasedSlider
    'xr-2d-input-text': GUI.InputText
    'xr-2d-input-text-area': GUI.InputTextArea
    'xr-2d-input-password': GUI.InputPassword
    'xr-2d-color-picker': GUI.ColorPicker
    'xr-2d-virtual-keyboard': GUI.VirtualKeyboard
    // 2D Layouts
    'xr-2d-rectangle': GUI.Rectangle
    'xr-2d-ellipse': GUI.Ellipse
    'xr-2d-stack-panel': GUI.StackPanel
    'xr-2d-grid': GUI.Grid
    'xr-2d-scroll-viewer': GUI.ScrollViewer
    // 3D Controls
    'xr-3d-button': GUI.Button3D
    'xr-3d-mesh-button': GUI.MeshButton3D
    'xr-3d-holographic-button': GUI.HolographicButton
    'xr-3d-touch-holographic-button': GUI.TouchHolographicButton
    'xr-3d-slider': GUI.Slider3D
    'xr-3d-holographic-slate': GUI.HolographicSlate
    'xr-3d-near-menu': GUI.NearMenu
    // 3D Layouts
    'xr-3d-stack-panel': GUI.StackPanel3D
    'xr-3d-plane-panel': GUI.PlanePanel
    'xr-3d-cylinder-panel': GUI.CylinderPanel
    'xr-3d-sphere-panel': GUI.SpherePanel
    'xr-3d-scatter-panel': GUI.ScatterPanel
  }
}
