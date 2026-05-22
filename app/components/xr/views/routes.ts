import type { XRRoute } from '../app/route'
import IndexView from './index.vue'
import SettingsView from './settings.vue'

export const xrRoutes: XRRoute[] = [
  { path: '/', name: 'index', component: IndexView },
  { path: '/settings', name: 'settings', component: SettingsView },
]
