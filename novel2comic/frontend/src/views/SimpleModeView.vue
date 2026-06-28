<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PromptInput from '@/components/PromptInput.vue'
import StyleSelector from '@/components/StyleSelector.vue'
import GenerationResult from '@/components/GenerationResult.vue'
import { generationApi } from '@/api/generation'
import type { ImageStyle, GenerationStatus } from '@/types'

const prompt = ref('')
const styles = ref<ImageStyle[]>([])
const selectedStyle = ref<ImageStyle | null>(null)
const stylesLoading = ref(true)
const stylesError = ref('')

// 生成状态
const currentRecordId = ref<number | null>(null)
const status = ref<GenerationStatus | null>(null)
const generating = ref(false)

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    const res = await generationApi.getStyles()
    styles.value = res.data.data
  } catch (e: any) {
    stylesError.value = e.response?.data?.message || e.message || '加载风格列表失败'
  } finally {
    stylesLoading.value = false
  }
})

function selectStyle(style: ImageStyle) {
  selectedStyle.value = style
}

async function generate() {
  if (!prompt.value.trim() || !selectedStyle.value) return

  generating.value = true
  status.value = null

  try {
    const res = await generationApi.simpleGenerate({
      prompt: prompt.value.trim(),
      style_id: selectedStyle.value.id,
    })

    currentRecordId.value = res.data.data.record_id
    status.value = { record_id: res.data.data.record_id, status: 'pending' }

    // 开始轮询
    startPolling()
  } catch (e: any) {
    status.value = {
      record_id: 0,
      status: 'failed',
      error_message: e.response?.data?.message || e.message || '生成请求失败',
    }
    generating.value = false
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)

  pollTimer = setInterval(async () => {
    if (!currentRecordId.value) return

    try {
      const res = await generationApi.getStatus(currentRecordId.value)
      status.value = res.data.data

      if (status.value.status === 'completed' || status.value.status === 'failed') {
        stopPolling()
        generating.value = false
      }
    } catch {
      stopPolling()
      generating.value = false
    }
  }, 2000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function downloadImage() {
  if (!status.value?.image_url) return
  const link = document.createElement('a')
  link.href = status.value.image_url
  link.download = `generated_${status.value.record_id}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-6">
    <!-- 左侧：输入 -->
    <div class="space-y-6">
      <div class="rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-6 space-y-5">
        <PromptInput v-model="prompt" :disabled="generating" />
        <StyleSelector
          :styles="styles"
          :selected-id="selectedStyle?.id ?? null"
          :loading="stylesLoading"
          @select="selectStyle"
        />
        <div v-if="stylesError"
             class="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {{ stylesError }}
        </div>
        <button
          @click="generate"
          :disabled="!prompt.trim() || !selectedStyle || generating"
          class="w-full py-4 rounded-xl text-base font-bold
                 bg-purple-600 hover:bg-purple-700 active:bg-purple-800
                 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-all duration-200 cursor-pointer
                 flex items-center justify-center gap-2"
        >
          <span v-if="generating" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {{ generating ? '生成中...' : '🎨 开始生成' }}
        </button>
      </div>
    </div>

    <!-- 右侧：结果 -->
    <div>
      <GenerationResult :status="status" :loading="generating" @download="downloadImage" />
    </div>
  </div>
</template>
