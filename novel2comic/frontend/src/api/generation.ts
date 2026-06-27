import http from './client'
import type {
  ApiResponse,
  ImageStyle,
  SimpleGenerateRequest,
  ProGenerateRequest,
  GenerateResponse,
  GenerationStatus,
} from '@/types'

export const generationApi = {
  // 获取风格列表
  getStyles() {
    return http.get<ApiResponse<ImageStyle[]>>('/generate/styles')
  },

  // 普通模式生成
  simpleGenerate(data: SimpleGenerateRequest) {
    return http.post<ApiResponse<GenerateResponse>>('/generate/simple', data)
  },

  // 专业模式生成
  proGenerate(data: ProGenerateRequest) {
    return http.post<ApiResponse<GenerateResponse>>('/generate/pro', data)
  },

  // 查询生成状态
  getStatus(id: number) {
    return http.get<ApiResponse<GenerationStatus>>(`/generate/status/${id}`)
  },
}
