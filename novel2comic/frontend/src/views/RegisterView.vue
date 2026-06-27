<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  username: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''

  if (!form.username.trim()) {
    error.value = '请输入用户名'
    return
  }
  if (form.username.trim().length < 3) {
    error.value = '用户名至少 3 个字符'
    return
  }
  if (!/^1\d{10}$/.test(form.phone.trim())) {
    error.value = '请输入有效的 11 位手机号'
    return
  }
  if (form.password.length < 6) {
    error.value = '密码至少 6 位'
    return
  }
  if (form.password !== form.confirmPassword) {
    error.value = '两次密码输入不一致'
    return
  }

  loading.value = true
  try {
    await authStore.register(form.username.trim(), form.phone.trim(), form.password)
    router.push('/generate/simple')
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-8">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white">注册</h1>
      <p class="text-gray-400 mt-2">创建账号，开始 AI 创作</p>
    </div>

    <form @submit.prevent="handleRegister"
          class="rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-6 space-y-4">

      <div v-if="error"
           class="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
        {{ error }}
      </div>

      <!-- 用户名 -->
      <div>
        <label for="reg-username" class="block text-sm font-medium text-gray-300 mb-1.5">用户名</label>
        <input id="reg-username" v-model="form.username" type="text" placeholder="3-64 个字符"
               class="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10
                      text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500
                      transition-all duration-200" />
      </div>

      <!-- 手机号 -->
      <div>
        <label for="reg-phone" class="block text-sm font-medium text-gray-300 mb-1.5">手机号</label>
        <input id="reg-phone" v-model="form.phone" type="tel" placeholder="11 位手机号"
               class="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10
                      text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500
                      transition-all duration-200" />
      </div>

      <!-- 密码 -->
      <div>
        <label for="reg-password" class="block text-sm font-medium text-gray-300 mb-1.5">密码</label>
        <input id="reg-password" v-model="form.password" type="password" placeholder="至少 6 位"
               class="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10
                      text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500
                      transition-all duration-200" />
      </div>

      <!-- 确认密码 -->
      <div>
        <label for="reg-confirm-password" class="block text-sm font-medium text-gray-300 mb-1.5">确认密码</label>
        <input id="reg-confirm-password" v-model="form.confirmPassword" type="password" placeholder="再次输入密码"
               class="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10
                      text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500
                      transition-all duration-200" />
      </div>

      <button type="submit" :disabled="loading"
              class="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700
                     text-white font-medium text-base
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 cursor-pointer">
        <span v-if="loading" class="inline-block w-5 h-5 border-2 border-white border-t-transparent
                                     rounded-full animate-spin mr-2 align-middle" />
        {{ loading ? '注册中...' : '注册' }}
      </button>

      <p class="text-center text-sm text-gray-400">
        已有账号？
        <router-link to="/login" class="text-cyan-400 hover:text-cyan-300">立即登录</router-link>
      </p>
    </form>
  </div>
</template>
