// ========== 通用 ==========
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// ========== 认证 ==========
export interface User {
  id: number
  username: string
  phone: string
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  phone: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface RefreshRequest {
  refresh_token: string
}

// ========== 图片风格 ==========
export interface ImageStyle {
  id: number
  name: string
  display_name: string
  description: string
  preset_params: Record<string, any>
  sort_order: number
  preview_url: string
  is_active: boolean
}

// ========== 生成 ==========
export interface SimpleGenerateRequest {
  prompt: string
  style_id: number
}

export interface ProGenerateRequest {
  prompt: string
  negative_prompt: string
  width: number
  height: number
  cfg_scale: number
  steps: number
  sampler: string
  seed: number
}

export interface GenerateResponse {
  record_id: number
  status: string
}

export interface GenerationStatus {
  record_id: number
  status: string
  image_url?: string
  thumbnail_url?: string
  seed?: number
  duration_ms?: number
  error_message?: string
  prompt?: string
  negative_prompt?: string
  width?: number
  height?: number
  cfg_scale?: number
  steps?: number
  sampler?: string
}

// ========== 生成记录 ==========
export type GenerationMode = 'simple' | 'pro'
export type GenerationStatusType = 'pending' | 'processing' | 'completed' | 'failed'

export interface GenerationRecord {
  id: number
  user_id: number
  mode: GenerationMode
  prompt: string
  negative_prompt: string
  style_id: number | null
  width: number
  height: number
  cfg_scale: number
  steps: number
  sampler: string
  seed: number
  image_url: string
  thumbnail_url: string
  status: GenerationStatusType
  error_message: string
  duration_ms: number
  created_at: string
  style?: ImageStyle
}

// ========== 历史 ==========
export interface HistoryListResponse {
  records: GenerationRecord[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ========== 预设采样器 ==========
export const SAMPLERS = [
  'Euler a',
  'Euler',
  'LMS',
  'Heun',
  'DPM2',
  'DPM2 a',
  'DPM++ 2S a',
  'DPM++ 2M',
  'DPM++ 2M Karras',
  'DPM++ SDE',
  'DPM++ SDE Karras',
  'DDIM',
  'PLMS',
] as const

// ========== 预设分辨率 ==========
export const RESOLUTIONS = [
  { label: '512 × 512 (1:1)', width: 512, height: 512 },
  { label: '768 × 512 (3:2)', width: 768, height: 512 },
  { label: '512 × 768 (2:3)', width: 512, height: 768 },
  { label: '768 × 768 (1:1)', width: 768, height: 768 },
  { label: '1024 × 1024 (1:1)', width: 1024, height: 1024 },
] as const
