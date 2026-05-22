import { useXRRouter as useInternalXRRouter, useXRRoute as useInternalXRRoute } from '../app/route'

export function useXRRouter() {
  return useInternalXRRouter()
}

export function useXRRoute() {
  return useInternalXRRoute()
}
