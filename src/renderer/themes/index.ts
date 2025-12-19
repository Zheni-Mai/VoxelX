//src/renderer/themes/index.ts
import { darkTheme } from './dark'
import { lightTheme } from './light'
import { cyberpunkTheme } from './cyberpunk'
import { oceanTheme } from './ocean'
import { forestTheme } from './forest'
import { sunsetTheme } from './sunset'
import { electronNetworkTheme } from './electronNetwork'

export const presetThemes = [
  darkTheme,
  lightTheme,
  cyberpunkTheme,
  oceanTheme,
  forestTheme,
  sunsetTheme,
  electronNetworkTheme,
] as const