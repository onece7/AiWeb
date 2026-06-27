<script setup lang="ts">
import type { ImageStyle } from '@/types'

defineProps<{
  styles: ImageStyle[]
  selectedId: number | null
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [style: ImageStyle]
}>()
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-300 mb-3">选择风格</label>

    <div v-if="loading" class="text-center py-8 text-gray-500">
      <div class="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p class="mt-2">加载风格列表...</p>
    </div>

    <div v-else-if="styles.length === 0" class="text-center py-8 text-gray-500">
      暂无可用的风格
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <button
        v-for="style in styles"
        :key="style.id"
        @click="emit('select', style)"
        :class="[
          'relative p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer',
          'hover:shadow-lg hover:shadow-purple-600/10',
          selectedId === style.id
            ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500'
            : 'border-white/10 bg-slate-800/60 hover:border-purple-500/50'
        ]"
      >
        <!-- 选中标记 -->
        <div
          v-if="selectedId === style.id"
          class="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"
        >
          <span class="text-white text-xs">✓</span>
        </div>

        <h3 class="font-medium text-white text-sm">{{ style.display_name }}</h3>
        <p v-if="style.description" class="text-xs text-gray-400 mt-1 line-clamp-2">
          {{ style.description }}
        </p>
      </button>
    </div>
  </div>
</template>
