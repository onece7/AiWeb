<script setup lang="ts">
</script>

<template>
  <div class="flex flex-col items-center justify-center py-24 text-center">
    <span class="text-7xl mb-4">🔮</span>
    <h1 class="text-4xl font-bold text-white mb-2">404</h1>
    <p class="text-gray-400 mb-6">页面不存在</p>
    <router-link
      to="/"
      class="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium
             transition-colors duration-200"
    >
      返回首页
    </router-link>
  </div>
</template>
