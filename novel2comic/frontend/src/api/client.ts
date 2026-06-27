import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types'
import { useAuthStore } from '@/stores/auth'

const http: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器: 添加 Authorization Header
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore()
    if (authStore.accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// 响应拦截器: 统一错误处理 + Token 自动刷新
let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (err: any) => void
}> = []

http.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse
    if (res.code !== 0 && res.code !== undefined) {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return response
  },
  async (error: AxiosError) => {
    const authStore = useAuthStore()

    // 401 未认证 → 尝试刷新 Token
    if (error.response?.status === 401) {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      if (!originalRequest._retry && authStore.refreshToken) {
        originalRequest._retry = true

        // 防止并发刷新
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingRequests.push({
              resolve: (token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`
                }
                resolve(http(originalRequest))
              },
              reject,
            })
          })
        }

        isRefreshing = true

        try {
          const res = await axios.post('/api/v1/auth/refresh', {
            refresh_token: authStore.refreshToken,
          })

          const newToken = res.data.data.access_token
          const newRefresh = res.data.data.refresh_token

          authStore.accessToken = newToken
          authStore.refreshToken = newRefresh
          localStorage.setItem('access_token', newToken)
          localStorage.setItem('refresh_token', newRefresh)

          // 重放挂起的请求
          pendingRequests.forEach(({ resolve }) => resolve(newToken))
          pendingRequests = []

          // 重试原始请求
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
          }
          return http(originalRequest)
        } catch {
          pendingRequests.forEach(({ reject }) => reject(error))
          pendingRequests = []
          authStore.logout()
          return Promise.reject(error)
        } finally {
          isRefreshing = false
        }
      }

      // 刷新失败或无 refresh_token → 登出
      authStore.logout()
    }

    return Promise.reject(error)
  }
)

export default http
