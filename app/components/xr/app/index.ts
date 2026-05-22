import { createRenderer } from '@vue/runtime-core'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import { isXRRootContainer, type XRComponentType, type XRNode, type XRNodeType, type XRParent, type XRRootContainer } from './types'
import { destroyNode } from '../composables/useXRObservable'
import { xrComponentRegistry } from './registry'
import { flushPendingVectorProps, patchXRProp } from './props'
import { xrLogger } from '../../utils/logger'

function describeParent(n: XRParent): string {
  if (!n) return 'null'
  if (isXRRootContainer(n)) return 'ROOT'
  const node = n as XRNode
  const inst = node.instance as { _host?: unknown, name?: string } | null
  return `${node.type}${inst?.name ? `(${inst.name})` : ''}${inst?._host ? '+host' : ''}`
}

type AnyRecord = Record<string, unknown>

interface ControlContainer {
  addControl: (control: unknown) => unknown
  removeControl?: (control: unknown) => unknown
}

interface ButtonContainer {
  addButton: (control: unknown) => unknown
  removeButton?: (control: unknown) => unknown
}

// `TouchHolographicMenu` (and its subclass `NearMenu`) refuses generic
// `addControl` and exposes `addButton` instead. We detect it structurally so
// the renderer doesn't have to special-case each subclass.
function asButtonContainer(instance: unknown): ButtonContainer | null {
  if (!instance) return null
  const candidate = instance as Partial<ButtonContainer>
  return typeof candidate.addButton === 'function' ? (candidate as ButtonContainer) : null
}

// Node types whose `addControl` is intercepted by TouchHolographicMenu's
// guard. Routing them through `addButton` keeps logs clean and actually
// registers the child in the menu's grid layout.
const BUTTON_MENU_PARENT_TYPES = new Set<XRNodeType>(['3d-near-menu'])

function isButtonMenuParent(type: XRNodeType | undefined): boolean {
  return !!type && BUTTON_MENU_PARENT_TYPES.has(type)
}

interface HostBearer {
  _host?: unknown
}

function hasHost(instance: unknown): boolean {
  return !!(instance && (instance as HostBearer)._host)
}

function attachChildToParent(parentNode: XRNode, child: XRNode): void {
  if (!child.instance || !parentNode.instance) {
    xrLogger.log('attach SKIP', child.type, '→', parentNode.type,
      'reason:', !child.instance ? 'no-child-inst' : 'no-parent-inst')
    return
  }

  if (isButtonMenuParent(parentNode.type)) {
    const buttonContainer = asButtonContainer(parentNode.instance)
    if (buttonContainer) {
      buttonContainer.addButton(child.instance)
      xrLogger.log('attach via addButton', child.type, '→', parentNode.type)
    } else {
      xrLogger.log('attach MISS-addButton on', parentNode.type)
    }
  } else {
    const container = asContainer(parentNode.instance)
    if (container) {
      container.addControl(child.instance)
      xrLogger.log('attach via addControl', child.type, '→', parentNode.type)
    } else {
      xrLogger.log('attach MISS-addControl on', parentNode.type)
    }
  }

  flushPendingVectorProps(child)
  flushContentDisplay(child)
  applyDeferredProps(child)
  // Recurse: now that this child has its own `_host`, drain its own buffer.
  drainPendingChildren(child)
}

function drainPendingChildren(parent: XRNode): void {
  const queue = parent._pendingChildren
  if (!queue || queue.length === 0) return
  xrLogger.log('drain', parent.type, 'count=', queue.length)
  // Take ownership and clear early so nested attaches don't see stale state.
  parent._pendingChildren = undefined
  for (const child of queue) {
    attachChildToParent(parent, child)
  }
}

// HolographicSlate / Button3D / HolographicButton / TouchHolographicButton /
// MeshButton3D all extend `ContentDisplay3D`. Its `content` setter bails
// silently while `_host` is null, which is the case for every node mounted
// before the parent is attached to GUI3DManager. We park the child here and
// re-apply it once `_host` is wired (see flushContentDisplay below).
const CONTENT_DISPLAY_TYPES = new Set<XRNodeType>([
  '3d-button',
  '3d-mesh-button',
  '3d-holographic-button',
  '3d-touch-holographic-button',
  '3d-holographic-slate',
])

function isContentDisplayParent(type: XRNodeType | undefined): boolean {
  return !!type && CONTENT_DISPLAY_TYPES.has(type)
}

function assignContentDisplayChild(parentNode: XRNode, child: GUI.Control): void {
  parentNode._pendingSlateContent = child
  const parent = parentNode.instance as unknown as ContentDisplayLike | null
  if (parent?._host?.utilityLayer) {
    parent.content = child
    parentNode._pendingSlateContent = null
  }
}

function flushContentDisplay(node: XRNode): void {
  const pending = node._pendingSlateContent
  if (!pending) return
  const inst = node.instance as unknown as ContentDisplayLike | null
  if (!inst) return
  inst.content = pending
  node._pendingSlateContent = null
}

interface ContentDisplayLike {
  content: GUI.Control | null
  _host?: { utilityLayer?: unknown } | null
}

let wrapperSeq = 0

function isType3D(type: XRNodeType | undefined): boolean {
  return !!type && type.startsWith('3d-')
}

function isType2D(type: XRNodeType | undefined): boolean {
  return !!type && type.startsWith('2d-')
}

function findRootContainer(parent: XRParent): XRRootContainer | null {
  let cursor: XRParent = parent
  while (cursor) {
    if (isXRRootContainer(cursor)) return cursor
    cursor = (cursor as XRNode).parent
  }
  return null
}

function resolveScene(parent: XRParent): BABYLON.Scene | null {
  const root = findRootContainer(parent)
  if (root) return root.scene

  let cursor: XRParent = parent
  while (cursor && !isXRRootContainer(cursor)) {
    const inst = (cursor as XRNode).instance as
      | (AnyRecord & { _host?: { scene?: BABYLON.Scene }, getScene?: () => BABYLON.Scene })
      | null
    if (inst) {
      if (inst._host?.scene) return inst._host.scene
      if (typeof inst.getScene === 'function') return inst.getScene()
    }
    cursor = (cursor as XRNode).parent
  }
  return null
}

function asContainer(instance: unknown): ControlContainer | null {
  if (!instance) return null
  const candidate = instance as Partial<ControlContainer>
  return typeof candidate.addControl === 'function' ? (candidate as ControlContainer) : null
}

function bridge2DInto3D(el: XRNode, parent: XRNode): boolean {
  const scene = resolveScene(parent)
  if (!scene) {
    console.warn('[XR] Cannot bridge 2D control into 3D parent — scene unavailable')
    return false
  }
  const inst = el.instance as GUI.Control | null
  if (!inst) return false

  const id = `xr-bridge-${++wrapperSeq}`
  const plane = BABYLON.MeshBuilder.CreatePlane(`${id}-plane`, { width: 1, height: 1 }, scene)
  plane.isPickable = true

  const adt = GUI.AdvancedDynamicTexture.CreateForMesh(plane, 1024, 1024, true)
  adt.addControl(inst)

  const meshButton = new GUI.MeshButton3D(plane, id)
  const parentInst = parent.instance as unknown as ControlContainer | null
  const container = parentInst ? asContainer(parentInst) : null
  if (!container) {
    adt.dispose()
    plane.dispose()
    meshButton.dispose()
    return false
  }
  container.addControl(meshButton)

  el._wrapperMesh = plane
  el._wrapperADT = adt
  el._wrapperMeshButton = meshButton
  return true
}

function disposeBridge(el: XRNode): void {
  const button = el._wrapperMeshButton
  const adt = el._wrapperADT
  const mesh = el._wrapperMesh

  if (button) {
    const host = (button as unknown as { _host?: ControlContainer })._host ?? null
    const parentInst = el.parent && !isXRRootContainer(el.parent) ? (el.parent as XRNode).instance : null
    const container = asContainer(parentInst) ?? (host as ControlContainer | null)
    container?.removeControl?.(button)
    button.dispose()
  }
  if (adt) adt.dispose()
  if (mesh) mesh.dispose(false, true)

  el._wrapperMeshButton = null
  el._wrapperADT = null
  el._wrapperMesh = null
}

function applyDeferredProps(el: XRNode): void {
  if (el._billboardMode === undefined || !el.instance) return
  const inst = el.instance as unknown as AnyRecord
  const node = (inst.node ?? inst.mesh ?? inst) as AnyRecord
  if (node && 'billboardMode' in node) node.billboardMode = el._billboardMode
}

export const { render, createApp } = createRenderer<XRComponentType, XRComponentType>({
  createElement(type, _isSVG, _isCustom, _props): XRComponentType {
    const componentDef = xrComponentRegistry[type]
    if (!componentDef) {
      xrLogger.log('createElement UNKNOWN', type)
      return { type: 'unknown', instance: null }
    }
    const node: XRNode = {
      type: componentDef.type,
      instance: componentDef.factory(),
      _pool: componentDef.pool ?? null,
    }
    xrLogger.log('createElement', componentDef.type)
    return node
  },

  insert(el, parent, _anchor) {
    if (!el) return
    el.parent = parent as XRParent

    if (!el.instance || el.isFragment || el.nodeType === 'comment' || el.nodeType === 'text') {
      xrLogger.log('insert SKIP', el?.type, '→', describeParent(parent as XRParent), 'reason:',
        !el.instance ? 'no-instance' : el.nodeType ?? 'fragment')
      return
    }
    if (!parent) {
      xrLogger.log('insert NO-PARENT', el.type)
      return
    }

    xrLogger.log('insert', el.type, '→', describeParent(parent as XRParent))

    // 1. Mount into XR root container
    if (isXRRootContainer(parent)) {
      if (isType3D(el.type)) {
        parent.gui3DManager.addControl(el.instance as GUI.Control3D)
        xrLogger.log('  → root.gui3DManager.addControl OK, pending=', el._pendingChildren?.length ?? 0)
        flushPendingVectorProps(el)
        flushContentDisplay(el)
        drainPendingChildren(el)
      } else if (isType2D(el.type)) {
        parent.ensureAdvancedTexture().addControl(el.instance as GUI.Control)
        xrLogger.log('  → root.advancedTexture.addControl OK')
        flushPendingVectorProps(el)
        drainPendingChildren(el)
      }
      applyDeferredProps(el)
      return
    }

    const parentNode = parent as XRNode
    const parentInst = parentNode.instance
    if (!parentInst) return

    // 2. ContentDisplay3D parents (slate, button3D, holographic-button, ...)
    //    keep a single GUI.Control as their facade. A 2D child becomes the
    //    facade content; deferred until _host is wired by the manager.
    if (isContentDisplayParent(parentNode.type) && isType2D(el.type)) {
      assignContentDisplayChild(parentNode, el.instance as GUI.Control)
      applyDeferredProps(el)
      return
    }

    // 3. 2D-in-3D bridge for container-style 3D parents (panels): wrap into
    //    plane → ADT → MeshButton3D so addControl receives a Control3D.
    if (isType3D(parentNode.type) && isType2D(el.type)) {
      if (bridge2DInto3D(el, parentNode)) {
        applyDeferredProps(el)
        return
      }
    }

    // 4. 3D parent without `_host` cannot accept children yet — Babylon's
    //    Container3D.addControl dereferences `this._host.utilityLayer` and
    //    crashes. Buffer; the parent will drain when it attaches.
    if (isType3D(parentNode.type) && !hasHost(parentInst)) {
      ;(parentNode._pendingChildren ??= []).push(el)
      xrLogger.log('  → DEFERRED (parent has no _host yet), pendingCount=', parentNode._pendingChildren.length)
      applyDeferredProps(el)
      return
    }

    // 5. Attach via the right channel (button-menu vs Container3D vs 2D).
    xrLogger.log('  → attachChildToParent')
    attachChildToParent(parentNode, el)
  },

  remove(el) {
    if (!el || !el.instance) return

    // 1. Detach from parent (bridge wrapper, control3D, control, root).
    if (el._wrapperMeshButton) {
      disposeBridge(el)
    } else {
      const parent = el.parent
      if (parent && isXRRootContainer(parent)) {
        if (isType3D(el.type)) parent.gui3DManager.removeControl(el.instance as GUI.Control3D)
        else if (isType2D(el.type)) parent.advancedTexture?.removeControl(el.instance as GUI.Control)
      } else if (parent) {
        // TouchHolographicMenu doesn't expose removeButton; the inherited
        // Container3D.removeControl handles detachment correctly.
        const container = asContainer((parent as XRNode).instance)
        container?.removeControl?.(el.instance)
      }
    }

    // 2. Clear Vue→Babylon observer bridges.
    if (el._observers) {
      el._observers.forEach(({ observable, observer }) => observable.remove(observer))
      el._observers.clear()
      el._observers = undefined
    }

    // 3. Detach FollowBehavior, if any.
    if (el._followBehavior) {
      const inst = el.instance as unknown as {
        mesh?: { removeBehavior?: (b: BABYLON.Behavior<BABYLON.TransformNode>) => unknown }
        removeBehavior?: (b: BABYLON.Behavior<BABYLON.TransformNode>) => unknown
      }
      ;(inst.removeBehavior ?? inst.mesh?.removeBehavior)?.call(inst.mesh ?? inst, el._followBehavior)
      el._followBehavior = null
    }

    // 4. Pool fast-path: release & hide, skip destroyNode entirely.
    if (el._pool) {
      const pooled = el.instance as unknown as GUI.Control3D
      el._pool.release(pooled)
      el.instance = null
      el.parent = null
      return
    }

    // 5. Deep VRAM cleanup for one-off nodes.
    destroyNode(el.instance)
    el.instance = null
    el.parent = null
  },

  patchProp(el, key, prevValue, nextValue) {
    if (!el) return
    patchXRProp(el, key, prevValue, nextValue)
  },

  createText(text): XRComponentType {
    return { type: 'unknown', instance: null, nodeType: 'text', text }
  },

  createComment(text): XRComponentType {
    return { type: 'unknown', instance: null, nodeType: 'comment', text }
  },

  setText(_node, _text) {
    // No-op: textual VNodes are surfaced via setElementText / `text` prop.
  },

  setElementText(node, text) {
    if (!node || !node.instance) return
    const inst = node.instance as unknown as AnyRecord
    if ('text' in inst) inst.text = text
  },

  parentNode(node) {
    if (!node) return null
    const parent = node.parent
    if (!parent || isXRRootContainer(parent)) return null
    return parent as XRNode
  },

  nextSibling(_node) {
    return null
  },

  querySelector(_selector) {
    return null
  },

  setScopeId(_el, _id) {
    // No-op
  },

  cloneNode(el) {
    return { ...el }
  },

  insertStaticContent(_content, _parent, _anchor, _isSVG, _start, _end) {
    const placeholder: XRComponentType = { type: 'unknown', instance: null }
    return [placeholder, placeholder]
  },
})
