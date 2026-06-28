<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { historyApi } from '@/api/history'
import ImageCard from '@/components/ImageCard.vue'
import type { GenerationRecord } from '@/types'

const records = ref<GenerationRecord[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const error = ref('')

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function loadHistory() {
  loading.value = true
  error.value = ''
  try {
    const res = await historyApi.getList(page.value, pageSize)
    records.value = res.data.data.records
    total.value = res.data.data.total
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function deleteRecord(id: number) {
  if (!confirm('确定删除这条记录？图片文件也会被删除。')) return
  try {
    await historyApi.delete(id)
    records.value = records.value.filter(r => r.id !== id)
    total.value--
  } catch (e: any) {
    alert(e.response?.data?.message || '删除失败')
  }
}

function viewDetail(id: number) {
  // TODO: 弹窗展示详情
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    loadHistory()
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    loadHistory()
  }
}

onMounted(loadHistory)
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-white mb-6">📋 生成历史</h1>

    <!-- 错误 -->
    <div v-if="error"
         class="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-6">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-gray-500">
      <div class="inline-block w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p class="mt-3">加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="records.length === 0"
         class="text-center py-16 rounded-2xl border border-white/10 bg-slate-800/60">
      <span class="text-5xl">📭</span>
      <p class="text-gray-400 mt-3">暂无生成记录</p>
      <router-link to="/generate/simple"
                   class="inline-block mt-4 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors duration-200">
        去生成
      </router-link>
    </div>

    <!-- 列表 -->
    <template v-else>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        <ImageCard
          v-for="record in records"
          :key="record.id"
          :record="record"
          @delete="deleteRecord"
          @view="viewDetail"
        />
      </div>

      <!-- 分页 -->
      <div class="flex items-center justify-center gap-4">
        <button
          @click="prevPage"
          :disabled="page <= 1"
          class="px-4 py-2 rounded-lg text-sm font-medium
                 bg-slate-800/60 border border-white/10 text-gray-300
                 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed
                 transition-all duration-200 cursor-pointer"
        >
          ← 上一页
        </button>
        <span class="text-sm text-gray-400">{{ page }} / {{ totalPages }}</span>
        <button
          @click="nextPage"
          :disabled="page >= totalPages"
          class="px-4 py-2 rounded-lg text-sm font-medium
                 bg-slate-800/60 border border-white/10 text-gray-300
                 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed
                 transition-all duration-200 cursor-pointer"
        >
          下一页 →
        </button>
      </div>
    </template>
  </div>
</template>
