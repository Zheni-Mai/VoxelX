import type { Theme } from '../hooks/useTheme'

export const darkTheme: Theme = {
  name: 'Dark',
  background: {
    type: 'color',
    color: 'linear-gradient(135deg, #0a0014 0%, #161616ff 35%, #353535ff 70%, #000000ff 100%)',
  },
  accentColor: '#06b6d4',
}