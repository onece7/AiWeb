<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const modeTabs = [
  { label: '普通模式', path: '/generate/simple' },
  { label: '专业模式', path: '/generate/pro' },
] as const

function goTo(path: string) {
  router.push(path)
}

function isActive(path: string) {
  return route.path === path
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="fixed top-3 left-3 right-3 z-50">
    <nav
      class="max-w-6xl mx-auto px-5 py-3 rounded-2xl
             bg-slate-800/80 backdrop-blur-xl border border-white/10
             flex items-center justify-between gap-4"
    >
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-2 shrink-0 no-underline">
        <span class="text-2xl">🎨</span>
        <span class="text-lg font-bold text-white hidden sm:inline">novel2comic</span>
      </router-link>

      <!-- 模式切换 -->
      <div v-if="authStore.isAuthenticated" class="flex bg-slate-900/60 rounded-lg p-0.5">
        <button
          v-for="tab in modeTabs"
          :key="tab.path"
          @click="goTo(tab.path)"
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer',
            isActive(tab.path)
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
              : 'text-gray-400 hover:text-white'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 右侧操作 -->
      <div class="flex items-center gap-3">
        <template v-if="authStore.isAuthenticated">
          <button
            @click="goTo('/history')"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer',
              isActive('/history')
                ? 'bg-slate-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
            ]"
          >
            📋 历史
          </button>
          <button
            @click="handleLogout"
            class="px-4 py-2 rounded-lg text-sm font-medium text-gray-400
                   hover:text-red-400 hover:bg-red-400/10 transition-colors duration-200 cursor-pointer"
          >
            登出
          </button>
        </template>
        <template v-else>
          <button
            @click="goTo('/login')"
            class="px-4 py-2 rounded-lg text-sm font-medium
                   bg-purple-600 hover:bg-purple-700 text-white
                   transition-colors duration-200 cursor-pointer"
          >
            登录
          </button>
        </template>
      </div>
    </nav>
  </header>
</template>
