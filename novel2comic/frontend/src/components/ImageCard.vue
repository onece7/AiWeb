<script setup lang="ts">
import type { GenerationRecord } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  record: GenerationRecord
}>()

const emit = defineEmits<{
  delete: [id: number]
  view: [id: number]
}>()

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '⏳ 排队中',
    processing: '🔄 生成中',
    completed: '✅ 完成',
    failed: '❌ 失败',
  }
  return map[props.record.status] ?? props.record.status
})

const formattedDate = computed(() => {
  return new Date(props.record.created_at).toLocaleString('zh-CN')
})

const modeLabel = computed(() => {
  return props.record.mode === 'simple' ? '普通' : '专业'
})
</script>

<template>
  <div
    class="group rounded-xl border border-white/10 bg-slate-800/60 overflow-hidden
           hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-600/10
           transition-all duration-200 cursor-pointer"
    @click="emit('view', record.id)"
  >
    <!-- 缩略图 -->
    <div class="aspect-square bg-slate-900/50 overflow-hidden">
      <img
        v-if="record.image_url"
        :src="record.image_url"
        :alt="record.prompt"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-700">
        <span class="text-4xl">🖼️</span>
      </div>
    </div>

    <!-- 信息 -->
    <div class="p-3">
      <p class="text-sm text-white line-clamp-2 mb-2" :title="record.prompt">
        {{ record.prompt }}
      </p>
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span>{{ statusLabel }}</span>
        <span>{{ modeLabel }}</span>
      </div>
      <div class="flex items-center justify-between text-xs text-gray-600 mt-1">
        <span>{{ formattedDate }}</span>
        <button
          v-if="record.status === 'completed' || record.status === 'failed'"
          @click.stop="emit('delete', record.id)"
          class="text-gray-600 hover:text-red-400 transition-colors duration-200 cursor-pointer"
          title="删除"
        >
          🗑
        </button>
      </div>
    </div>
  </div>
</template>
