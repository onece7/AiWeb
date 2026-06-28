import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 扩展 RouteMeta 类型
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guest?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/generate/simple',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/generate/simple',
    name: 'SimpleMode',
    component: () => import('@/views/SimpleModeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/generate/pro',
    name: 'ProMode',
    component: () => import('@/views/ProModeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 等待 init() 完成（App.vue onMounted 中调用）
  // 如果尚未初始化且本地有 token，等待短暂时间让 init 完成
  if (!authStore.initialized) {
    // 同步检查：如果本地有 token，先放行，init 会在后台完成
    // 如果完全没有 token，直接按未登录处理
    const hasLocalToken = !!localStorage.getItem('access_token') || !!localStorage.getItem('refresh_token')
    if (!hasLocalToken) {
      authStore.initialized = true // 标记已完成（无需初始化）
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 需要登录但未登录 → 跳转登录页
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && authStore.isAuthenticated) {
    // 已登录用户访问游客页面 → 跳转首页
    next({ path: '/generate/simple' })
  } else {
    next()
  }
})

export default router
