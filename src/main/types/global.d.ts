// src/main/types/global.d.ts
import { showToast } from '../main' 

declare global {
  interface Window {
    showToast: typeof showToast
  }
  var showToast: typeof showToast
}

export {}