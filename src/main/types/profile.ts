// src/main/types/profile.ts
export interface Profile {
  name: string
  version: string
  loader: 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge' | 'liteloader' | 'optifine'
  gameDirectory: string
  loaderVersion?: string
  optifine?: boolean | string
  installed: boolean
  isDefault?: boolean
  isSelected?: boolean
  icon?: string
  resolution?: { width: number; height: number }
  memory?: { min: string; max: string }
  jvmArgs?: string
  gameArgs?: string
  showLaunchLog?: boolean
  javaVersion?: 8 | 11 | 17 | 21 | 25
  useAuthlibInjector?: boolean
  forceDedicatedGPU?: boolean | null
  enableFeatherUI?: boolean
}