// ./types/account.ts
export interface Account {
  id: string
  name: string
  uuid: string
  type: 'offline' | 'microsoft' | 'elyby'
  lastUsed?: number
  accessToken?: string
  refreshToken?: string
  clientToken?: string
  authProvider?: 'mojang' | 'microsoft' | 'elyby'
}