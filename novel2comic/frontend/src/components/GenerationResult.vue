<script setup lang="ts">
import type { GenerationStatus } from '@/types'

defineProps<{
  status: GenerationStatus | null
  loading: boolean
}>()

const emit = defineEmits<{
  download: []
}>()

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '排队中',
    processing: '生成中',
    completed: '已完成',
    failed: '失败',
  }
  return map[status] ?? status
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-yellow-400',
    processing: 'text-cyan-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  }
  return map[status] ?? 'text-gray-400'
}
</script>

<template>
  <div class="rounded-2xl border border-white/10 bg-slate-800/60 overflow-hidden">
    <!-- 头部 -->
    <div class="px-5 py-3 border-b border-white/5 flex items-center justify-between">
      <h3 class="font-medium text-white">生成结果</h3>
      <div v-if="status" class="flex items-center gap-3">
        <span :class="['text-sm font-medium', statusColor(status.status)]">
          {{ statusLabel(status.status) }}
        </span>
        <span v-if="status.duration_ms" class="text-xs text-gray-500">
          {{ (status.duration_ms / 1000).toFixed(1) }}s
        </span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="p-4">
      <!-- Loading -->
      <div v-if="loading || status?.status === 'pending' || status?.status === 'processing'"
           class="flex flex-col items-center justify-center py-16 text-gray-500">
        <div class="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>{{ status?.status === 'processing' ? 'AI 正在生成图片...' : '等待生成...' }}</p>
        <p class="text-xs mt-1 text-gray-600">这可能需要 10-60 秒</p>
      </div>

      <!-- 失败 -->
      <div v-else-if="status?.status === 'failed'"
           class="flex flex-col items-center justify-center py-16 text-red-400">
        <span class="text-4xl mb-3">⚠️</span>
        <p class="font-medium">生成失败</p>
        <p class="text-sm text-gray-500 mt-1">{{ status.error_message || '未知错误' }}</p>
      </div>

      <!-- 完成 -->
      <div v-else-if="status?.status === 'completed' && status.image_url" class="space-y-3">
        <img
          :src="status.image_url"
          :alt="status.prompt ?? '生成的图片'"
          class="w-full rounded-xl border border-white/5 shadow-2xl"
          loading="lazy"
        />

        <!-- 参数信息 -->
        <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs text-gray-400">
          <div class="bg-slate-900/50 rounded-lg p-2 text-center">
            <span class="block text-gray-500">Seed</span>
            <span class="text-white font-mono">{{ status.seed ?? '-' }}</span>
          </div>
          <div class="bg-slate-900/50 rounded-lg p-2 text-center">
            <span class="block text-gray-500">尺寸</span>
            <span class="text-white">{{ status.width }}×{{ status.height }}</span>
          </div>
          <div class="bg-slate-900/50 rounded-lg p-2 text-center">
            <span class="block text-gray-500">Steps</span>
            <span class="text-white">{{ status.steps ?? '-' }}</span>
          </div>
          <div class="bg-slate-900/50 rounded-lg p-2 text-center">
            <span class="block text-gray-500">CFG</span>
            <span class="text-white">{{ status.cfg_scale ?? '-' }}</span>
          </div>
          <div class="bg-slate-900/50 rounded-lg p-2 text-center">
            <span class="block text-gray-500">采样器</span>
            <span class="text-white truncate block">{{ status.sampler ?? '-' }}</span>
          </div>
        </div>

        <!-- 下载按钮 -->
        <button
          @click="emit('download')"
          class="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700
                 text-white font-medium transition-colors duration-200
                 flex items-center justify-center gap-2 cursor-pointer"
        >
          💾 下载图片
        </button>
      </div>

      <!-- 空状态 -->
      <div v-else class="flex flex-col items-center justify-center py-16 text-gray-600">
        <span class="text-5xl mb-4">🖼️</span>
        <p>输入描述并点击生成，图片将在此展示</p>
      </div>
    </div>
  </div>
</template>
