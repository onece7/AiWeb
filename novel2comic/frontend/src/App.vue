<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-900">
    <AppHeader />
    <main class="pt-20 pb-12 px-4 max-w-6xl mx-auto">
      <RouterView />
    </main>
  </div>
</template>
