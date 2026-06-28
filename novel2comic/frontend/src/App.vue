<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  authStore.init()
})
</script>

<template>
  <div class="min-h-screen bg-slate-900">
    <AppHeader />
    <main class="pt-20 pb-12 px-4 max-w-6xl mx-auto">
      <RouterView />
    </main>
  </div>
</template>
