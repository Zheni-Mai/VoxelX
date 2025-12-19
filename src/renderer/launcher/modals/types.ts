// src/renderer/profiles/modals/types.ts

export type TabType = 'modpack' | 'mod' | 'shader' | 'resourcepack' | 'datapack'
export type ModrinthProjectType = 'mod' | 'modpack' | 'resourcepack' | 'datapack' | 'shader'

export interface ModrinthProject {
  id: string
  slug: string
  title: string
  description: string
  icon_url?: string
  downloads: number
  author: string
  project_type: ModrinthProjectType
  versions: string[]
  client_side: string
  server_side: string
  follower_count: number
}

export interface ModrinthVersionFile {
  hashes: {
    sha512: string
    sha1: string
  }
  url: string
  filename: string
  primary: boolean
  size: number
}

export interface ModrinthVersion {
  id: string
  project_id: string
  author_id: string
  name: string
  version_number: string
  changelog: string | null
  changelog_url?: string
  date_published: string
  downloads: number
  version_type: 'release' | 'beta' | 'alpha'
  featured: boolean
  status: 'approved' | 'rejected' | 'draft' | 'unlisted' | 'archived' | 'unknown'
  requested_status?: string | null

  files: ModrinthVersionFile[]
  dependencies: Array<{
    dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
    project_id?: string
    version_id?: string
    file_name?: string
  }>

  game_versions: string[]
  loaders: string[]
  gallery?: Array<{
    url: string
    featured: boolean
    title?: string
    description?: string
    created: string
    ordering: number
  }>
}