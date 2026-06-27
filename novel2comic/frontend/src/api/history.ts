import http from './client'
import type { ApiResponse, HistoryListResponse, GenerationRecord } from '@/types'

export const historyApi = {
  // 获取历史列表
  getList(page = 1, pageSize = 20) {
    return http.get<ApiResponse<HistoryListResponse>>('/history', {
      params: { page, page_size: pageSize },
    })
  },

  // 获取历史详情
  getDetail(id: number) {
    return http.get<ApiResponse<GenerationRecord>>(`/history/${id}`)
  },

  // 删除历史记录
  delete(id: number) {
    return http.delete<ApiResponse<null>>(`/history/${id}`)
  },
}
