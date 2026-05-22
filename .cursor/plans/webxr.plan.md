---
name: webxr-declarative-ui-plan
overview: Detailed implementation roadmap for building a high-performance, declarative WebXR UI plugin for Vue 3 / Nuxt 3 using Babylon.js, addressing reactivity overhead, lifecycle resilience, memory leaks, and raycasting conflicts.
todos:
  - id: setup-interfaces-renderer-config
    content: Define TypeScript interfaces for custom VNodes and Babylon UI nodes, map component tags in custom renderer config.
    status: completed
  - id: implement-custom-renderer-core
    content: Implement the createRenderer configuration with strict filtration for Vue meta/comment nodes to safeguard Babylon scene hierarchy.
    status: completed
  - id: integrate-fast-path-and-pooling
    content: Design Fast-Path Reactivity buffer and integrate the XRNodePool registry inside app/utils/xr-pool.ts.
    status: completed
  - id: implement-xr-input-bridge-and-dormant-mode
    content: Create useXR.ts containing the XRInputBridge input mapping and Session State Preservation (Dormant Mode).
    status: completed
  - id: integrate-deep-disposal-and-observer-registrar
    content: Develop the destroyNode deep-disposal routine and author useXRObservable.ts to automate cleanup of event listeners.
    status: completed
  - id: apply-bitwise-layer-masking-and-raycast-rules
    content: Apply Bitwise Layer Masking and pointerSelectionPredicate configuration to prevent raypass-through and world-UI ray conflicts.
    status: completed
isProject: false
---

# Implementation Plan: Declarative WebXR UI Plugin for Vue 3 & Nuxt 3

This specification outlines the concrete steps to implement a high-performance, robust, and declarative WebXR UI system. The architecture is designed to bridge Vue 3's reactive Virtual DOM with Babylon.js's imperative 3D render loop safely, maintaining stable 90/120 FPS performance in XR devices.

---

## Architectural Workflow

Nuxt 3:
{PROJECT}/app/components/xr/
├── app/                  # Системное ядро и навигация
│   ├── index.ts          # Инициализация кастомного рендерера (createRenderer)
│   └── route.ts          # Кастомный XR-роутер (State Machine)
├── bridge/               # Браузерный 2D-интерфейс поверх Canvas (HTML/CSS)
│   ├── enter-button.vue  # Кнопка запроса WebXR сессии
│   └── loader-screen.vue # Экран предзагрузки ассетов и текстур
├── core/                 # Корневой контекст сцены
│   └── provider.vue      # Провайдер движка, сцены и WebXR Experience Helper
├── 2d/                   # Компоненты плоского интерфейса (BABYLON.GUI)
│   ├── atoms/            # Текст, иконки, базовые формы
│   ├── inputs/           # Кнопки, слайдеры, поля ввода
│   └── layouts/          # Сетки, контейнеры, панели
├── 3d/                   # Объемные XR-компоненты (BABYLON.GUI 3D)
│   ├── controls/         # 3D-кнопки, слайдеры, планшеты, манипуляторы
│   └── layouts/          # 3D-контейнеры (цилиндрические, сферические панели)
├── composables/          # Vue-хуки для работы внутри XR-сцены
│   ├── use-xr-router.ts  # Доступ к навигации внутри XR
│   └── use-xr-context.ts # Инжект инстансов сцены и менеджеров
└── utils/                # Чистая математика и валидаторы
    ├── math.ts           # Хелперы для векторов и кватернионов
    └── webxr-check.ts    # Проверка поддержки WebXR API в браузере


## You can create other folders and files IN {PROJECT}/app/components/xr/
if you need to create, for example, a plugin or store or something else outside, then there should be simple logic outside, like setup.() the section that you will take from {PROJECT}/app/components/xr/core/

The diagram below illustrates the relationship between the Vue 3 reactivity layer, our custom renderer with high-performance buffers/pools, and the Babylon.js 3D engine.

```mermaid
graph TD
    subgraph VueApp [Vue 3 / Nuxt 3 Layer]
        VueComponents["Declarative Components (xr-scene, xr-slate)"]
        ReactivitySystem["Vue Reactivity (shallowRef, Props)"]
    end

    subgraph CustomRenderer [Custom Renderer Bridge]
        RendererEngine["createRenderer() Hook Config"]
        FastPathBuffer["Direct Mutation Buffer"]
        ObjectPoolRegistry["Mesh Object Pool Registry"]
    end

    subgraph BabylonEngine [Babylon.js 3D/XR Engine]
        BabylonScene["Babylon.js Scene & Render Loop"]
        XRInputBridge["XRInputBridge (Controllers / Hands)"]
        LayerMasking["Layer Mask Filters (Bitwise Layers)"]
    end

    VueComponents -->|Render Tree| RendererEngine
    ReactivitySystem -.-->|Low-Frequency Updates| RendererEngine
    ReactivitySystem -->|High-Frequency Sync| FastPathBuffer
    RendererEngine -->|Virtual Pointer Events| VueComponents
    
    RendererEngine -->|imperative API| BabylonScene
    FastPathBuffer -->|Direct Property Writes| BabylonScene
    ObjectPoolRegistry -->|Recycle Nodes| BabylonScene
    
    XRInputBridge -->|Unified Pointer Data| RendererEngine
    BabylonScene -->|Raycast Masking| LayerMasking
```

---

## Detailed Implementation Roadmap

### Phase 1: Environment Setup & Babylon.js Registration
1. Add necessary packages: `babylonjs`, `babylonjs-gui` (or the ES6 equivalents `@babylonjs/core` and `@babylonjs/gui`) to the Nuxt project.
2. Since WebXR and WebGL require browser context, create a client-side only plugin to register and expose our declarative components.
3. Configure Nuxt/Vite to properly handle Babylon.js packages (optimizing tree-shaking and resolving external dependencies).

---

### Phase 2: Vue 3 Custom Renderer Config (`app/plugins/xr-renderer.client.ts`)
1. Define a custom VNode renderer using `@vue/runtime-core`'s `createRenderer()`.
2. Map custom tags (`xr-scene`, `xr-slate`, `xr-stack-panel`, `xr-button`) to their Babylon.js objects (e.g. `HolographicSlate`, `StackPanel3D`, `HolographicButton`).
3. Add safety filters during structural tree operations (`insert`, `createElement`, `remove`) to completely bypass Vue fragments and comment VNodes (often generated by `v-for` or hidden templates), which would otherwise break the Babylon.js hierarchy matrix.

#### Draft Implementation Snippet
```typescript
import { createRenderer } from '@vue/runtime-core'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'

export const { render, createApp } = createRenderer({
  createElement(type, isSVG, isCustom, props) {
    switch (type) {
      case 'xr-slate':
        return { type: 'slate', instance: new GUI.HolographicSlate() }
      case 'xr-button':
        return { type: 'button', instance: new GUI.HolographicButton() }
      // ... other components
      default:
        return { type: 'unknown', instance: null }
    }
  },
  insert(el, parent, anchor) {
    if (!el || !el.instance || el.isFragment || el.nodeType === 'comment') {
      return // Robust filtration of Vue-internal comment/meta VNodes
    }
    if (parent && parent.instance && typeof parent.instance.addControl === 'function') {
      parent.instance.addControl(el.instance)
    }
  },
  remove(el) {
    if (el && el.instance) {
      destroyNode(el.instance)
    }
  },
  patchProp(el, key, prevValue, nextValue) {
    // Handled via Fast-Path Reactivity Buffer
  },
  // ... other required runtime-core interface methods
})
```

---

### Phase 3: High-Frequency Reactivity & Node Recycling Pool (`app/utils/xr-pool.ts`)
1. **Fast-Path Reactivity Pattern:** Avoid standard Vue `watch` or proxied parameters for values updating at 90Hz+. Store high-frequency properties (like positions, rotation, scale) in a flat native float buffer or standard JavaScript object. Use a central hook on `scene.onBeforeRenderObservable` to sync values directly into Babylon.js structures.
2. **Object Pooling Pattern:** Build a Node Recycling Registry for lists (`v-for`). Instead of invoking `dispose()` and instantiating memory/materials anew, keep a pooled registry of standard meshes/controls.
   - When items are deleted from a reactive collection: hide the node (`mesh.setEnabled(false)` or `control.isVisible = false`).
   - When items are added: fetch an existing node from the registry, re-enable it, and update its properties.

#### Draft Pool Interface
```typescript
export class XRNodePool<T extends { isVisible: boolean }> {
  private activeNodes = new Set<T>()
  private inactivePool: T[] = []

  constructor(private factory: () => T) {}

  acquire(): T {
    let node: T
    if (this.inactivePool.length > 0) {
      node = this.inactivePool.pop()!
    } else {
      node = this.factory()
    }
    node.isVisible = true
    this.activeNodes.add(node)
    return node
  }

  release(node: T) {
    if (this.activeNodes.has(node)) {
      this.activeNodes.delete(node)
      node.isVisible = false
      this.inactivePool.push(node)
    }
  }
}
```

---

### Phase 4: WebXR Input Abstraction & Dormant Mode (`app/composables/useXR.ts`)
1. **Input Abstraction Layer (`XRInputBridge`):** Create a unified virtual interface mapping hardware-specific inputs (Oculus Controller lasers vs Apple Vision Pro pinching rays) to a stable, hardware-agnostic Virtual Pointer. This stops Vue from unmounting/refreshing the UI tree during input transitions.
2. **Session Preservation (Dormant Mode):** Keep Vue's stateful tree intact when leaving an XR session. Instead of discarding components:
   - Transition UI nodes to a dedicated, non-rendered layer mask or detach the camera control.
   - Stop heavy animation or rendering tickers, while preserving local reactive variables (input fields, scrolling offsets).
   - Re-enable and project back onto the XR Camera upon re-entry.

---

### Phase 5: Memory Leak Mitigation & Clean Disposal (`app/composables/useXRObservable.ts`)
1. **Teardown Tree Protocol (`destroyNode`):** Create a deep cleanup utility that guarantees 100% garbage collection in WebGL/WebGPU context.
   - Dispose GUI textures cleanly: `.dispose()` on `AdvancedDynamicTexture`.
   - Evict materials and cached textures: call `material.dispose(true, true)` to purge graphics card buffers.
   - Clean observers systematically.
2. **Observer Registrar Pattern:** Provide a reactive wrapper `useXRObservable` to register all listener handles. Automatically clean up and remove registered observers inside Vue's `onBeforeUnmount` lifecycle hook.

#### Safe Disposing Draft
```typescript
export function destroyNode(node: any) {
  if (!node) return

  // 1. Dispose GUI dependencies
  if (node.advancedDynamicTexture) {
    node.advancedDynamicTexture.dispose()
  }

  // 2. Erase Materials & Texture buffer memory
  if (node.material) {
    if (node.material.diffuseTexture) node.material.diffuseTexture.dispose()
    node.material.dispose(true, true)
  }

  // 3. Clear observers to break closures and garbage collector cycles
  if (node._registeredObservers) {
    node._registeredObservers.forEach((obs: any) => obs.remove())
    node._registeredObservers = []
  }

  // 4. Dispose the component itself
  if (typeof node.dispose === 'function') {
    node.dispose(false, true)
  }
}
```

---

### Phase 6: Bitwise Layer Masking & Raycasting Collision Avoidance
1. Define clear hexadecimal layer constants for the app:
   - `XR_WORLD_LAYER = 0x00000001` (Physics, environment elements)
   - `XR_SYSTEM_UI_LAYER = 0x10000000` (Interactions, Panels, Slates)
   - `XR_HUD_LAYER = 0x20000000` (Static non-interactive stats, HUDs)
2. Attach a target predicate filter to the WebXR experience helper to restrict interactive rays strictly to the UI layer:
   ```typescript
   xrHelper.pointerSelection.pointerSelectionPredicate = (mesh) => {
     return (mesh.layerMask & XR_SYSTEM_UI_LAYER) !== 0
   }
   ```
3. **Event Blockade (Ray Pass-Through Prevention):** Prevent "laser click-through" by setting `eventState.skipNextObservers = true` on the GUI mesh's `onPointerDownObservable`. This halts ray calculations immediately upon hitting a UI panel, blocking actions on any world objects positioned behind the panel.
