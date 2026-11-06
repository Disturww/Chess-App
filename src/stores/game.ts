import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const currentPgn = ref('')
  const isPlaying = ref(false)
  const pendingPgn = ref<string | null>(null)

  function setPgn(pgn: string) { currentPgn.value = pgn }
  function startGame() { isPlaying.value = true }
  function stopGame() { isPlaying.value = false }

  function setPendingPgn(pgn: string) { pendingPgn.value = pgn }
  function consumePendingPgn(): string | null {
    const pgn = pendingPgn.value
    pendingPgn.value = null
    return pgn
  }

  return {
    currentPgn,
    isPlaying,
    pendingPgn,
    setPgn,
    startGame,
    stopGame,
    setPendingPgn,
    consumePendingPgn,
  }
})
