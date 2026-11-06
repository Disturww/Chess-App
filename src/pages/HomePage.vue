<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-dark-bg text-white flex justify-center items-center p-6">
    <div class="bg-card-bg rounded-2xl p-12 text-center min-w-[320px] shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      <h1 class="text-5xl m-0 mb-2">♚ Chess</h1>
      <p class="text-gray-400 m-0 mb-8">Play, learn, and improve</p>

      <div class="flex flex-col gap-3">
        <button
          class="py-3.5 px-4 border-none rounded-lg text-base font-semibold cursor-pointer transition-colors bg-green text-[#1b1b1b] hover:opacity-90"
          @click="router.push('/game')"
        >
          Play Game
        </button>
        <button
          class="py-3.5 px-4 border-none rounded-lg text-base font-semibold cursor-pointer transition-colors bg-btn-bg text-white hover:bg-btn-hover"
          @click="router.push('/history')"
        >
          Game History
        </button>
        <button
          class="py-3.5 px-4 border-none rounded-lg text-base font-semibold cursor-pointer transition-colors bg-btn-bg text-white hover:bg-btn-hover"
          @click="router.push('/settings')"
        >
          Settings
        </button>
      </div>
    </div>
  </div>
</template>
