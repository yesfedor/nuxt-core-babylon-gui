import type { XRRoute } from '../app/route'
import IndexView from './index.vue'
import SettingsView from './settings.vue'

// Eager imports — `defineAsyncComponent` chains badly with the XR custom
// renderer (Suspense would mount a fallback into the 3D graph that gets
// disposed before its Babylon internals are built). XR view bundles are small
// so eager-loading them is acceptable; switch back to async only after the
// renderer gains a proper suspense boundary.
export const xrRoutes: XRRoute[] = [
  { path: '/', name: 'index', component: IndexView },
  { path: '/settings', name: 'settings', component: SettingsView },
]
