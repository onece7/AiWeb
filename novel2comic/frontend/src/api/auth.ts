import http from './client'
import type { ApiResponse, LoginRequest, LoginResponse, RegisterRequest, RefreshRequest } from '@/types'

export const authApi = {
  register(data: RegisterRequest) {
    return http.post<ApiResponse<LoginResponse>>('/auth/register', data)
  },

  login(data: LoginRequest) {
    return http.post<ApiResponse<LoginResponse>>('/auth/login', data)
  },

  refresh(data: RefreshRequest) {
    return http.post<ApiResponse<LoginResponse>>('/auth/refresh', data)
  },

  logout(data: RefreshRequest) {
    return http.post<ApiResponse<null>>('/auth/logout', data)
  },
}
