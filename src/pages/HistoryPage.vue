<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useHistoryStore, type SavedGame } from '@/stores/history'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const historyStore = useHistoryStore()
const gameStore = useGameStore()

function replay(game: SavedGame) {
  gameStore.setPendingPgn(game.pgn)
  router.push('/game')
}

function downloadPgn(game: SavedGame) {
  const blob = new Blob([game.pgn], { type: 'application/x-chess-pgn' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `chess-${game.id}.pgn`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-screen bg-dark-bg text-white p-6">
    <div class="flex items-center gap-4 mb-5">
      <button class="px-3.5 py-2 border-none rounded text-sm font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover" @click="router.push('/')">← Back</button>
      <h3 class="m-0">Game History</h3>
      <button
        v-if="historyStore.savedGames.length > 0"
        class="ml-auto px-3 py-1.5 border-none rounded text-xs font-semibold cursor-pointer bg-btn-bg text-white hover:bg-btn-hover"
        @click="historyStore.clearGames()"
      >
        Clear all
      </button>
    </div>

    <div v-if="historyStore.savedGames.length === 0" class="text-center mt-20 text-gray-500">
      <p>No saved games yet.</p>
      <p class="text-sm">Play a game and save it from the game page.</p>
    </div>

    <div v-else class="max-w-[600px] flex flex-col gap-2">
      <div
        v-for="game in historyStore.savedGames"
        :key="game.id"
        class="bg-card-bg rounded-lg px-4 py-3 flex items-center justify-between"
      >
        <div class="flex flex-col gap-1">
          <span class="font-semibold">{{ game.white }} vs {{ game.black }}</span>
          <span class="text-sm text-green">{{ game.result }}</span>
          <span class="text-xs text-gray-500">{{ game.date }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="bg-btn-bg border-none text-white cursor-pointer text-xs font-semibold px-3 py-1.5 rounded hover:bg-btn-hover"
            @click="replay(game)"
          >
            Replay
          </button>
          <button
            class="bg-btn-bg border-none text-white cursor-pointer text-xs font-semibold px-3 py-1.5 rounded hover:bg-btn-hover"
            @click="downloadPgn(game)"
          >
            PGN
          </button>
          <button
            class="bg-transparent border-none text-red cursor-pointer text-lg px-2 py-1 rounded hover:bg-red/15"
            @click="historyStore.deleteGame(game.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
