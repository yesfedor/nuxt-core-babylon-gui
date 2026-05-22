import type * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import type { XRInstance, XRNodeType } from './types'
import { type AnyPoolableControl, type XRNodePool, registerXRPool } from '../utils/xr-pool'

export interface XRComponentDef {
  type: XRNodeType
  factory: () => XRInstance
  pool?: XRNodePool<AnyPoolableControl>
}

// --- Pools for heavy, v-for-friendly interactive elements ---------------------

const holographicButtonPool = registerXRPool<GUI.HolographicButton>(
  'xr-3d-holographic-button',
  () => new GUI.HolographicButton('xr-holo-btn'),
  (node) => {
    node.text = ''
    node.imageUrl = ''
  },
)

const touchHolographicButtonPool = registerXRPool<GUI.TouchHolographicButton>(
  'xr-3d-touch-holographic-button',
  () => new GUI.TouchHolographicButton('xr-touch-holo-btn'),
  (node) => {
    node.text = ''
    node.imageUrl = ''
  },
)

const meshButton3DPool = registerXRPool<GUI.MeshButton3D>(
  'xr-3d-mesh-button',
  () => new GUI.MeshButton3D(null as unknown as BABYLON.Mesh, 'xr-mesh-btn'),
)

// --- Component registry ------------------------------------------------------

export const xrComponentRegistry: Record<string, XRComponentDef> = {
  // 2D Atoms
  'xr-2d-text-block': { type: '2d-text-block', factory: (): GUI.TextBlock => new GUI.TextBlock() },
  'xr-2d-image': { type: '2d-image', factory: (): GUI.Image => new GUI.Image() },
  'xr-2d-line': { type: '2d-line', factory: (): GUI.Line => new GUI.Line() },
  'xr-2d-multi-line': { type: '2d-multi-line', factory: (): GUI.MultiLine => new GUI.MultiLine() },
  'xr-2d-display-grid': { type: '2d-display-grid', factory: (): GUI.DisplayGrid => new GUI.DisplayGrid() },

  // 2D Inputs
  'xr-2d-button': { type: '2d-button', factory: (): GUI.Button => new GUI.Button() },
  'xr-2d-checkbox': { type: '2d-checkbox', factory: (): GUI.Checkbox => new GUI.Checkbox() },
  'xr-2d-radio-button': { type: '2d-radio-button', factory: (): GUI.RadioButton => new GUI.RadioButton() },
  'xr-2d-slider': { type: '2d-slider', factory: (): GUI.Slider => new GUI.Slider() },
  'xr-2d-image-based-slider': { type: '2d-image-based-slider', factory: (): GUI.ImageBasedSlider => new GUI.ImageBasedSlider() },
  'xr-2d-input-text': { type: '2d-input-text', factory: (): GUI.InputText => new GUI.InputText() },
  'xr-2d-input-text-area': { type: '2d-input-text-area', factory: (): GUI.InputTextArea => new GUI.InputTextArea() },
  'xr-2d-input-password': { type: '2d-input-password', factory: (): GUI.InputPassword => new GUI.InputPassword() },
  'xr-2d-color-picker': { type: '2d-color-picker', factory: (): GUI.ColorPicker => new GUI.ColorPicker() },
  'xr-2d-virtual-keyboard': { type: '2d-virtual-keyboard', factory: (): GUI.VirtualKeyboard => new GUI.VirtualKeyboard() },

  // 2D Layouts
  'xr-2d-rectangle': { type: '2d-rectangle', factory: (): GUI.Rectangle => new GUI.Rectangle() },
  'xr-2d-ellipse': { type: '2d-ellipse', factory: (): GUI.Ellipse => new GUI.Ellipse() },
  'xr-2d-stack-panel': { type: '2d-stack-panel', factory: (): GUI.StackPanel => new GUI.StackPanel() },
  'xr-2d-grid': { type: '2d-grid', factory: (): GUI.Grid => new GUI.Grid() },
  'xr-2d-scroll-viewer': { type: '2d-scroll-viewer', factory: (): GUI.ScrollViewer => new GUI.ScrollViewer() },

  // 3D Controls (heavy → pooled)
  'xr-3d-button': { type: '3d-button', factory: (): GUI.Button3D => new GUI.Button3D() },
  'xr-3d-mesh-button': {
    type: '3d-mesh-button',
    factory: (): GUI.MeshButton3D => meshButton3DPool.acquire(),
    pool: meshButton3DPool as unknown as XRNodePool<AnyPoolableControl>,
  },
  'xr-3d-holographic-button': {
    type: '3d-holographic-button',
    factory: (): GUI.HolographicButton => holographicButtonPool.acquire(),
    pool: holographicButtonPool as unknown as XRNodePool<AnyPoolableControl>,
  },
  'xr-3d-touch-holographic-button': {
    type: '3d-touch-holographic-button',
    factory: (): GUI.TouchHolographicButton => touchHolographicButtonPool.acquire(),
    pool: touchHolographicButtonPool as unknown as XRNodePool<AnyPoolableControl>,
  },
  'xr-3d-slider': { type: '3d-slider', factory: (): GUI.Slider3D => new GUI.Slider3D() },
  'xr-3d-holographic-slate': { type: '3d-holographic-slate', factory: (): GUI.HolographicSlate => new GUI.HolographicSlate() },
  'xr-3d-near-menu': { type: '3d-near-menu', factory: (): GUI.NearMenu => new GUI.NearMenu('xr-near-menu') },

  // 3D Layouts
  'xr-3d-stack-panel': { type: '3d-stack-panel', factory: (): GUI.StackPanel3D => new GUI.StackPanel3D() },
  'xr-3d-plane-panel': { type: '3d-plane-panel', factory: (): GUI.PlanePanel => new GUI.PlanePanel() },
  'xr-3d-cylinder-panel': { type: '3d-cylinder-panel', factory: (): GUI.CylinderPanel => new GUI.CylinderPanel() },
  'xr-3d-sphere-panel': { type: '3d-sphere-panel', factory: (): GUI.SpherePanel => new GUI.SpherePanel() },
  'xr-3d-scatter-panel': { type: '3d-scatter-panel', factory: (): GUI.ScatterPanel => new GUI.ScatterPanel() },
}
