<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const charCount = computed(() => props.modelValue.length)
const isNearLimit = computed(() => charCount.value > (props.maxLength ?? 2000) * 0.9)
</script>

<template>
  <div class="relative">
    <label for="prompt-input" class="block text-sm font-medium text-gray-300 mb-2">
      描述你想生成的画面
    </label>
    <textarea
      id="prompt-input"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      :disabled="disabled"
      :placeholder="placeholder ?? '例如：一只穿着太空服的柴犬在月球上奔跑，数字艺术风格'"
      :maxlength="maxLength ?? 2000"
      rows="4"
      class="w-full px-4 py-3 rounded-xl
             bg-slate-800/60 border border-white/10
             text-white placeholder-gray-500
             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
             disabled:opacity-50 disabled:cursor-not-allowed
             resize-y transition-all duration-200"
    />
    <div class="flex justify-end mt-1">
      <span
        :class="[
          'text-xs transition-colors duration-200',
          isNearLimit ? 'text-red-400' : 'text-gray-500'
        ]"
      >
        {{ charCount }}/{{ maxLength ?? 2000 }}
      </span>
    </div>
  </div>
</template>
