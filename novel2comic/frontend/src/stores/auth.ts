import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))

  // 计算属性
  const isAuthenticated = computed(() => !!accessToken.value)
  const username = computed(() => user.value?.username ?? '')

  // 初始化：如果有 token 则尝试获取用户信息
  async function init() {
    // 页面刷新后 token 从 localStorage 恢复
    // 尝试用 refresh token 恢复 session
    if (!accessToken.value && refreshToken.value) {
      try {
        const res = await authApi.refresh({ refresh_token: refreshToken.value })
        setTokens(res.data.data.access_token, res.data.data.refresh_token)
      } catch {
        clearTokens()
      }
    }
  }

  // 登录
  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    setTokens(res.data.data.access_token, res.data.data.refresh_token)
  }

  // 注册
  async function register(username: string, phone: string, password: string) {
    const res = await authApi.register({ username, phone, password })
    setTokens(res.data.data.access_token, res.data.data.refresh_token)
  }

  // 登出
  async function logout() {
    try {
      if (refreshToken.value) {
        await authApi.logout({ refresh_token: refreshToken.value })
      }
    } catch {
      // 忽略登出 API 错误
    } finally {
      clearTokens()
    }
  }

  // 设置 Token
  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  }

  // 清除 Token
  function clearTokens() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    username,
    init,
    login,
    register,
    logout,
  }
})
