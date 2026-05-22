import { defineNuxtPlugin } from '#app'
import { createApp } from '../components/xr/app'

export default defineNuxtPlugin((nuxtApp) => {
  // Provide the XR renderer
  nuxtApp.provide('xrCreateApp', createApp)
})
