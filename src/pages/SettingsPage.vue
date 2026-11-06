<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePreferencesStore, type AiLevel, type PlayerColor } from '@/stores/preferences'

const router = useRouter()
const prefs = usePreferencesStore()

const aiLevels: AiLevel[] = ['easy', 'medium', 'hard']
const aiLevelLabels: Record<AiLevel, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const colors: { value: PlayerColor; label: string }[] = [
  { value: 'w', label: 'White' },
  { value: 'b', label: 'Black' },
]
</script>

<template>
  <div class="min-h-screen bg-dark-bg text-white p-6">
    <div class="flex items-center gap-4 mb-5">
      <button class="px-3.5 py-2 border-none rounded text-sm font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="router.push('/')">← Back</button>
      <h3 class="m-0">Settings</h3>
    </div>

    <div class="max-w-[400px] flex flex-col gap-1">
      <label class="bg-card-bg rounded-lg px-4 py-3.5 flex justify-between items-center cursor-pointer">
        <span>Sound Effects</span>
        <input type="checkbox" class="w-[18px] h-[18px] cursor-pointer" :checked="prefs.soundEnabled" @change="prefs.toggleSound()" />
      </label>

      <label class="bg-card-bg rounded-lg px-4 py-3.5 flex justify-between items-center cursor-pointer">
        <span>Dark Mode</span>
        <input type="checkbox" class="w-[18px] h-[18px] cursor-pointer" :checked="prefs.darkMode" @change="prefs.toggleDarkMode()" />
      </label>

      <div class="bg-card-bg rounded-lg px-4 py-3.5">
        <span class="block mb-2">AI Difficulty</span>
        <div class="flex gap-2">
          <button
            v-for="level in aiLevels"
            :key="level"
            class="flex-1 px-3 py-1.5 text-sm rounded font-semibold cursor-pointer border-none"
            :class="prefs.aiLevel === level ? 'bg-green text-[#1b1b1b]' : 'bg-btn-bg text-white hover:bg-btn-hover'"
            @click="prefs.setAiLevel(level)"
          >
            {{ aiLevelLabels[level] }}
          </button>
        </div>
      </div>

      <div class="bg-card-bg rounded-lg px-4 py-3.5">
        <span class="block mb-2">Play as (vs AI)</span>
        <div class="flex gap-2">
          <button
            v-for="color in colors"
            :key="color.value"
            class="flex-1 px-3 py-1.5 text-sm rounded font-semibold cursor-pointer border-none"
            :class="prefs.playerColor === color.value ? 'bg-green text-[#1b1b1b]' : 'bg-btn-bg text-white hover:bg-btn-hover'"
            @click="prefs.setPlayerColor(color.value)"
          >
            {{ color.label }}
          </button>
        </div>
      </div>

      <p class="text-xs text-gray-500 px-1 mt-1">Settings and saved games are stored locally in your browser.</p>
    </div>
  </div>
</template>
