import type { XRRoute } from '../app/route'
import { defineAsyncComponent } from 'vue'

export const xrRoutes: XRRoute[] = [
  { path: '/', name: 'index', component: defineAsyncComponent(() => import('./index.vue')) },
  { path: '/settings', name: 'settings', component: defineAsyncComponent(() => import('./settings.vue')) }
]
