import type { Theme } from '../hooks/useTheme'

export const sunsetTheme: Theme = {
  name: 'Sunset',
  background: {
    type: 'gradient',
    color: 'linear-gradient(135deg, #332100ff 0%, #884d00ff 35%, #b86e00ff 70%, #412500ff 100%)',
  },
  accentColor: '#f97316',
  backgroundClass: 'sunset-animated',
}