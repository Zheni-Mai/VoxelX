import type { Theme } from '../hooks/useTheme'

export const lightTheme: Theme = {
  name: 'Light',
  background: {
    type: 'color',
    color: 'linear-gradient(135deg, #2c2c2cff 0%, #858585ff 35%, #eeeeeeff 70%, #797979ff 100%)',
  },
  accentColor: '#e4e4e4ff',
}