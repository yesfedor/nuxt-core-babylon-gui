import * as GUI from '@babylonjs/gui'
import type { XRNodeType } from './types'

type ComponentFactory = () => any

export const xrComponentRegistry: Record<string, { type: XRNodeType, factory: ComponentFactory }> = {
  // 2D Atoms
  'xr-2d-text-block': { type: '2d-text-block', factory: () => new GUI.TextBlock() },
  'xr-2d-image': { type: '2d-image', factory: () => new GUI.Image() },
  'xr-2d-line': { type: '2d-line', factory: () => new GUI.Line() },
  'xr-2d-multi-line': { type: '2d-multi-line', factory: () => new GUI.MultiLine() },
  'xr-2d-display-grid': { type: '2d-display-grid', factory: () => new GUI.DisplayGrid() },

  // 2D Inputs
  'xr-2d-button': { type: '2d-button', factory: () => new GUI.Button() },
  'xr-2d-checkbox': { type: '2d-checkbox', factory: () => new GUI.Checkbox() },
  'xr-2d-radio-button': { type: '2d-radio-button', factory: () => new GUI.RadioButton() },
  'xr-2d-slider': { type: '2d-slider', factory: () => new GUI.Slider() },
  'xr-2d-image-based-slider': { type: '2d-image-based-slider', factory: () => new GUI.ImageBasedSlider() },
  'xr-2d-input-text': { type: '2d-input-text', factory: () => new GUI.InputText() },
  'xr-2d-input-text-area': { type: '2d-input-text-area', factory: () => new GUI.InputTextArea() },
  'xr-2d-input-password': { type: '2d-input-password', factory: () => new GUI.InputPassword() },
  'xr-2d-color-picker': { type: '2d-color-picker', factory: () => new GUI.ColorPicker() },
  'xr-2d-virtual-keyboard': { type: '2d-virtual-keyboard', factory: () => new GUI.VirtualKeyboard() },

  // 2D Layouts
  'xr-2d-rectangle': { type: '2d-rectangle', factory: () => new GUI.Rectangle() },
  'xr-2d-ellipse': { type: '2d-ellipse', factory: () => new GUI.Ellipse() },
  'xr-2d-stack-panel': { type: '2d-stack-panel', factory: () => new GUI.StackPanel() },
  'xr-2d-grid': { type: '2d-grid', factory: () => new GUI.Grid() },
  'xr-2d-scroll-viewer': { type: '2d-scroll-viewer', factory: () => new GUI.ScrollViewer() },

  // 3D Controls
  'xr-3d-button': { type: '3d-button', factory: () => new GUI.Button3D() },
  'xr-3d-mesh-button': { type: '3d-mesh-button', factory: () => new GUI.MeshButton3D(null as any, 'mesh-button') }, // Requires mesh injection later
  'xr-3d-holographic-button': { type: '3d-holographic-button', factory: () => new GUI.HolographicButton() },
  'xr-3d-touch-holographic-button': { type: '3d-touch-holographic-button', factory: () => new GUI.TouchHolographicButton() },
  'xr-3d-slider': { type: '3d-slider', factory: () => new GUI.Slider3D() },
  'xr-3d-holographic-slate': { type: '3d-holographic-slate', factory: () => new GUI.HolographicSlate() },
  'xr-3d-near-menu': { type: '3d-near-menu', factory: () => new GUI.NearMenu() },

  // 3D Layouts
  'xr-3d-stack-panel': { type: '3d-stack-panel', factory: () => new GUI.StackPanel3D() },
  'xr-3d-plane-panel': { type: '3d-plane-panel', factory: () => new GUI.PlanePanel() },
  'xr-3d-cylinder-panel': { type: '3d-cylinder-panel', factory: () => new GUI.CylinderPanel() },
  'xr-3d-sphere-panel': { type: '3d-sphere-panel', factory: () => new GUI.SpherePanel() },
  'xr-3d-scatter-panel': { type: '3d-scatter-panel', factory: () => new GUI.ScatterPanel() },
}
