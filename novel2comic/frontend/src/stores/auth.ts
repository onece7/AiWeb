import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/api/auth'

// 解码 JWT payload 获取用户信息
function parseJwtPayload(token: string): { user_id: number; username: string } | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    if (decoded.user_id && decoded.username) {
      return { user_id: decoded.user_id, username: decoded.username }
    }
    return null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const initialized = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!accessToken.value)
  const username = computed(() => user.value?.username ?? '')

  // 初始化：恢复会话
  async function init() {
    // 有 refresh token 就尝试刷新（无论 access token 是否存在）
    if (refreshToken.value) {
      try {
        const res = await authApi.refresh({ refresh_token: refreshToken.value })
        setTokens(res.data.data.access_token, res.data.data.refresh_token)
      } catch {
        // 刷新失败，清除本地状态
        clearTokens()
      }
    }

    // 从现有 access token 解码用户信息
    if (accessToken.value) {
      const payload = parseJwtPayload(accessToken.value)
      if (payload) {
        user.value = {
          id: payload.user_id,
          username: payload.username,
          phone: '',
        }
      }
    }

    initialized.value = true
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

    // 从 JWT 解码用户信息
    const payload = parseJwtPayload(access)
    if (payload) {
      user.value = {
        id: payload.user_id,
        username: payload.username,
        phone: '',
      }
    }
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
    initialized,
    isAuthenticated,
    username,
    init,
    login,
    register,
    logout,
  }
})
