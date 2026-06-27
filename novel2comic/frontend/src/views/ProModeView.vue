<script setup lang="ts">
import { ref, reactive } from 'vue'
import PromptInput from '@/components/PromptInput.vue'
import GenerationResult from '@/components/GenerationResult.vue'
import { generationApi } from '@/api/generation'
import { SAMPLERS, RESOLUTIONS } from '@/types'
import type { GenerationStatus } from '@/types'

// 表单参数
const form = reactive({
  prompt: '',
  negativePrompt: '',
  width: 512,
  height: 512,
  cfgScale: 7.0,
  steps: 20,
  sampler: 'Euler a',
  seed: -1,
  customResolution: true,
})

// 分辨率快捷选择
function selectResolution(w: number, h: number) {
  form.width = w
  form.height = h
}

// 生成状态
const currentRecordId = ref<number | null>(null)
const status = ref<GenerationStatus | null>(null)
const generating = ref(false)
const seedUsed = ref<number | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

async function generate() {
  if (!form.prompt.trim()) return

  generating.value = true
  status.value = null

  try {
    const res = await generationApi.proGenerate({
      prompt: form.prompt.trim(),
      negative_prompt: form.negativePrompt.trim(),
      width: form.width,
      height: form.height,
      cfg_scale: form.cfgScale,
      steps: form.steps,
      sampler: form.sampler,
      seed: form.seed,
    })

    currentRecordId.value = res.data.data.record_id
    status.value = { record_id: res.data.data.record_id, status: 'pending' }
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
      if (status.value.seed) seedUsed.value = status.value.seed
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
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
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
    <!-- 左侧：参数面板 -->
    <div class="space-y-6">
      <div class="rounded-2xl border border-white/10 bg-slate-800/60 backdrop-blur-xl p-6 space-y-5">
        <PromptInput v-model="form.prompt" :disabled="generating" />

        <!-- 反向提示词 -->
        <div>
          <label for="neg-prompt" class="block text-sm font-medium text-gray-300 mb-2">
            反向提示词 <span class="text-gray-600">(可选)</span>
          </label>
          <textarea
            id="neg-prompt"
            v-model="form.negativePrompt"
            :disabled="generating"
            rows="2"
            placeholder="不想出现的元素，如：low quality, blurry, watermark"
            class="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10
                   text-white placeholder-gray-500 resize-y
                   focus:outline-none focus:ring-2 focus:ring-purple-500
                   disabled:opacity-50 transition-all duration-200"
          />
        </div>

        <!-- 高级参数 -->
        <details class="group">
          <summary class="text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer select-none">
            ⚙️ 高级参数
          </summary>
          <div class="mt-4 space-y-4">
            <!-- 分辨率 -->
            <div>
              <label class="block text-xs text-gray-500 mb-2">分辨率</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="res in RESOLUTIONS"
                  :key="res.label"
                  @click="selectResolution(res.width, res.height)"
                  :class="[
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer',
                    form.width === res.width && form.height === res.height
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-900/60 text-gray-400 hover:text-white hover:bg-slate-700'
                  ]"
                >
                  {{ res.label }}
                </button>
              </div>
              <!-- 自定义分辨率 -->
              <div class="flex gap-2 mt-2">
                <input v-model.number="form.width" type="number" min="64" max="2048" step="64"
                       class="w-24 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-white text-sm text-center
                              focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200" />
                <span class="text-gray-600 self-center">×</span>
                <input v-model.number="form.height" type="number" min="64" max="2048" step="64"
                       class="w-24 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-white text-sm text-center
                              focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200" />
              </div>
            </div>

            <!-- CFG Scale -->
            <div>
              <label class="flex justify-between text-xs text-gray-500 mb-1">
                <span>CFG Scale</span>
                <span class="text-white font-mono">{{ form.cfgScale.toFixed(1) }}</span>
              </label>
              <input v-model.number="form.cfgScale" type="range" min="1" max="30" step="0.5"
                     class="w-full accent-purple-500 cursor-pointer" />
            </div>

            <!-- Steps -->
            <div>
              <label class="flex justify-between text-xs text-gray-500 mb-1">
                <span>采样步数</span>
                <span class="text-white font-mono">{{ form.steps }}</span>
              </label>
              <input v-model.number="form.steps" type="range" min="1" max="150" step="1"
                     class="w-full accent-purple-500 cursor-pointer" />
            </div>

            <!-- Sampler -->
            <div>
              <label for="sampler" class="block text-xs text-gray-500 mb-1">采样器</label>
              <select
                id="sampler"
                v-model="form.sampler"
                class="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all duration-200"
              >
                <option v-for="s in SAMPLERS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <!-- Seed -->
            <div>
              <label for="seed" class="block text-xs text-gray-500 mb-1">
                Seed <span class="text-gray-600">(-1 = 随机)</span>
              </label>
              <input
                id="seed"
                v-model.number="form.seed"
                type="number"
                placeholder="-1"
                class="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200" />
            </div>
          </div>
        </details>

        <!-- 生成按钮 -->
        <button
          @click="generate"
          :disabled="!form.prompt.trim() || generating"
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
