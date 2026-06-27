<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({
  username: '',
  password: '',
})

const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

async function handleLogin() {
  error.value = ''

  if (!form.username.trim() || !form.password) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    await authStore.login(form.username.trim(), form.password)
    const redirect = (route.query.redirect as string) || '/generate/simple'
    router.push(redirect)
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-8">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white">登录</h1>
      <p class="text-gray-400 mt-2">欢迎回来，继续你的创作之旅</p>
    </div>

    <form @submit.prevent="handleLogin"
          class="rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-6 space-y-5">

      <!-- 错误提示 -->
      <div v-if="error"
           class="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
        {{ error }}
      </div>

      <!-- 用户名 -->
      <div>
        <label for="username" class="block text-sm font-medium text-gray-300 mb-1.5">用户名</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          autocomplete="username"
          placeholder="请输入用户名"
          class="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10
                 text-white placeholder-gray-500
                 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                 transition-all duration-200"
        />
      </div>

      <!-- 密码 -->
      <div>
        <label for="password" class="block text-sm font-medium text-gray-300 mb-1.5">密码</label>
        <div class="relative">
          <input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="请输入密码"
            class="w-full px-4 py-3 pr-11 rounded-xl bg-slate-900/60 border border-white/10
                   text-white placeholder-gray-500
                   focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                   transition-all duration-200"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300
                   transition-colors duration-200 cursor-pointer"
            tabindex="-1"
          >
            {{ showPassword ? '🙈' : '👁' }}
          </button>
        </div>
      </div>

      <!-- 按钮 -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700
               text-white font-medium text-base
               disabled:opacity-50 disabled:cursor-not-allowed
               transition-all duration-200 cursor-pointer"
      >
        <span v-if="loading" class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle" />
        {{ loading ? '登录中...' : '登录' }}
      </button>

      <!-- 注册链接 -->
      <p class="text-center text-sm text-gray-400">
        还没有账号？
        <router-link to="/register" class="text-cyan-400 hover:text-cyan-300">立即注册</router-link>
      </p>
    </form>
  </div>
</template>
